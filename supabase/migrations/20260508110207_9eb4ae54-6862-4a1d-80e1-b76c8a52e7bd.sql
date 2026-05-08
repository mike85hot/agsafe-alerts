
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'field_agent', 'farmer');
CREATE TYPE public.threshold_type AS ENUM ('drought', 'flood', 'heat');
CREATE TYPE public.severity_level AS ENUM ('watch', 'warning', 'emergency');
CREATE TYPE public.delivery_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'undelivered');

-- =========================
-- updated_at helper
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role: SECURITY DEFINER prevents recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================
-- CLUSTERS
-- =========================
CREATE TABLE public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  lga TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  crop_type TEXT,
  field_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_clusters_updated BEFORE UPDATE ON public.clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_clusters_agent ON public.clusters(field_agent_id);
CREATE INDEX idx_clusters_state ON public.clusters(state);

-- =========================
-- FARMERS
-- =========================
CREATE TABLE public.farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable, optional farmer login
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_farmers_updated BEFORE UPDATE ON public.farmers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_farmers_cluster ON public.farmers(cluster_id);
CREATE INDEX idx_farmers_phone ON public.farmers(phone);
CREATE INDEX idx_farmers_user ON public.farmers(user_id);

-- =========================
-- THRESHOLD RULES
-- =========================
CREATE TABLE public.threshold_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES public.clusters(id) ON DELETE CASCADE, -- null = global/state rule
  state TEXT, -- null = applies everywhere
  type public.threshold_type NOT NULL,
  metric TEXT NOT NULL, -- e.g. "rainfall_mm", "temp_max_c"
  value NUMERIC NOT NULL,
  window_hours INTEGER NOT NULL DEFAULT 24,
  severity public.severity_level NOT NULL,
  template_en TEXT NOT NULL,
  template_ha TEXT,
  template_yo TEXT,
  template_pcm TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_preset BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.threshold_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON public.threshold_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_rules_cluster ON public.threshold_rules(cluster_id);
CREATE INDEX idx_rules_active ON public.threshold_rules(active);

-- =========================
-- WEATHER READINGS
-- =========================
CREATE TABLE public.weather_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  temp_c NUMERIC,
  temp_max_c NUMERIC,
  rainfall_mm NUMERIC,
  humidity NUMERIC,
  wind_speed NUMERIC,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weather_readings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_weather_cluster_time ON public.weather_readings(cluster_id, fetched_at DESC);

-- =========================
-- ALERT EVENTS
-- =========================
CREATE TABLE public.alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.threshold_rules(id) ON DELETE SET NULL,
  type public.threshold_type NOT NULL,
  severity public.severity_level NOT NULL,
  message TEXT NOT NULL,
  metric_value NUMERIC,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suppressed BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alerts_cluster_time ON public.alert_events(cluster_id, triggered_at DESC);
CREATE INDEX idx_alerts_rule_time ON public.alert_events(rule_id, triggered_at DESC);

-- =========================
-- ALERT DELIVERIES
-- =========================
CREATE TABLE public.alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alert_events(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  status public.delivery_status NOT NULL DEFAULT 'queued',
  provider TEXT NOT NULL DEFAULT 'twilio',
  provider_message_id TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON public.alert_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_deliveries_alert ON public.alert_deliveries(alert_id);
CREATE INDEX idx_deliveries_farmer ON public.alert_deliveries(farmer_id);
CREATE INDEX idx_deliveries_status ON public.alert_deliveries(status);

-- =========================
-- CRON RUNS
-- =========================
CREATE TABLE public.cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL DEFAULT 'check_weather',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  clusters_checked INTEGER NOT NULL DEFAULT 0,
  alerts_triggered INTEGER NOT NULL DEFAULT 0,
  deliveries_queued INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  status TEXT NOT NULL DEFAULT 'running'
);
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cron_runs_started ON public.cron_runs(started_at DESC);

-- =========================
-- RLS POLICIES
-- =========================

-- profiles
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- user_roles: read own, admin reads all; only admin writes (via SECURITY DEFINER fn)
CREATE POLICY "roles_self_select" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- clusters
CREATE POLICY "clusters_admin_all" ON public.clusters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "clusters_agent_select" ON public.clusters FOR SELECT TO authenticated
  USING (field_agent_id = auth.uid());
CREATE POLICY "clusters_farmer_select" ON public.clusters FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.cluster_id = clusters.id AND f.user_id = auth.uid()));

-- farmers
CREATE POLICY "farmers_admin_all" ON public.farmers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "farmers_agent_select" ON public.farmers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clusters c WHERE c.id = farmers.cluster_id AND c.field_agent_id = auth.uid()));
CREATE POLICY "farmers_self_select" ON public.farmers FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "farmers_self_update" ON public.farmers FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- threshold_rules
CREATE POLICY "rules_admin_all" ON public.threshold_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "rules_agent_select" ON public.threshold_rules FOR SELECT TO authenticated
  USING (
    cluster_id IS NULL
    OR EXISTS (SELECT 1 FROM public.clusters c WHERE c.id = threshold_rules.cluster_id AND c.field_agent_id = auth.uid())
  );

-- weather_readings
CREATE POLICY "weather_admin_all" ON public.weather_readings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "weather_agent_select" ON public.weather_readings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clusters c WHERE c.id = weather_readings.cluster_id AND c.field_agent_id = auth.uid()));
CREATE POLICY "weather_farmer_select" ON public.weather_readings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.cluster_id = weather_readings.cluster_id AND f.user_id = auth.uid()));

-- alert_events
CREATE POLICY "alerts_admin_all" ON public.alert_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "alerts_agent_select" ON public.alert_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clusters c WHERE c.id = alert_events.cluster_id AND c.field_agent_id = auth.uid()));
CREATE POLICY "alerts_farmer_select" ON public.alert_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.alert_deliveries d
    JOIN public.farmers f ON f.id = d.farmer_id
    WHERE d.alert_id = alert_events.id AND f.user_id = auth.uid()
  ));

-- alert_deliveries
CREATE POLICY "deliveries_admin_all" ON public.alert_deliveries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "deliveries_agent_select" ON public.alert_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.alert_events a
    JOIN public.clusters c ON c.id = a.cluster_id
    WHERE a.id = alert_deliveries.alert_id AND c.field_agent_id = auth.uid()
  ));
CREATE POLICY "deliveries_farmer_select" ON public.alert_deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = alert_deliveries.farmer_id AND f.user_id = auth.uid()));

-- cron_runs (admin only)
CREATE POLICY "cron_admin_all" ON public.cron_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================
-- AUTO-CREATE PROFILE + DEFAULT FARMER ROLE on signup
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'farmer');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- DEFAULT THRESHOLD PRESETS (global)
-- =========================
INSERT INTO public.threshold_rules
  (cluster_id, state, type, metric, value, window_hours, severity, template_en, language, active, is_preset)
VALUES
  (NULL, NULL, 'drought', 'rainfall_mm_total', 20, 14*24, 'warning',
   'AGSAFE WARNING: Drought risk. Less than 20mm rain in 14 days. Mulch your crops and conserve water today. Reply STOP to opt out.', 'en', TRUE, TRUE),
  (NULL, NULL, 'flood', 'rainfall_mm_total', 80, 48, 'emergency',
   'AGSAFE EMERGENCY: Flood risk. Over 80mm rain expected in 48 hours. Move livestock and harvest mature crops to higher ground now. Reply STOP to opt out.', 'en', TRUE, TRUE),
  (NULL, NULL, 'heat', 'temp_max_c', 38, 5*24, 'warning',
   'AGSAFE WARNING: Heat stress. Temperature above 38C for 5 days. Water crops at dawn or dusk and shade seedlings today. Reply STOP to opt out.', 'en', TRUE, TRUE);
