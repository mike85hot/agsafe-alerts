// Weather provider abstraction. Swap implementation to plug NiMet, satellite feed, etc.
// SECURITY: server-only.

export interface WeatherReading {
  tempC: number | null;
  tempMaxC: number | null;
  rainfallMm: number | null; // last 1h or 3h rainfall reported by the provider
  humidity: number | null;
  windSpeed: number | null;
  raw: unknown;
}

export interface WeatherProvider {
  name: string;
  fetch(lat: number, lng: number): Promise<WeatherReading>;
}

// OpenWeatherMap "current weather" endpoint.
async function fetchOpenWeatherMap(lat: number, lng: number): Promise<WeatherReading> {
  const key = process.env.OPENWEATHERMAP_API_KEY;
  if (!key) throw new Error("OPENWEATHERMAP_API_KEY missing");
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OWM ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    main?: { temp?: number; temp_max?: number; humidity?: number };
    rain?: { "1h"?: number; "3h"?: number };
    wind?: { speed?: number };
  };
  return {
    tempC: data.main?.temp ?? null,
    tempMaxC: data.main?.temp_max ?? null,
    rainfallMm: data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0,
    humidity: data.main?.humidity ?? null,
    windSpeed: data.wind?.speed ?? null,
    raw: data,
  };
}

export const openWeatherMapProvider: WeatherProvider = {
  name: "openweathermap",
  fetch: fetchOpenWeatherMap,
};

export function getWeatherProvider(): WeatherProvider {
  return openWeatherMapProvider;
}
