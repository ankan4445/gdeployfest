import { z } from "genkit";
import { ai } from "../ai.js";

// Open-Meteo is free and requires no API key — works immediately as a demo.
export const weatherTool = ai.defineTool(
  {
    name: "getCurrentWeather",
    description:
      "Get current weather conditions for a geographic location. " +
      "Use this when the input text mentions a city, country, or any location.",
    inputSchema: z.object({
      latitude: z.number().describe("Latitude of the location"),
      longitude: z.number().describe("Longitude of the location"),
      locationName: z.string().describe("Human-readable name of the location for context"),
    }),
    outputSchema: z.object({
      locationName: z.string(),
      temperature_c: z.number(),
      windspeed_kmh: z.number(),
      weathercode: z.number().describe("WMO weather interpretation code"),
      description: z.string().describe("Human-readable weather condition"),
    }),
  },
  async ({ latitude, longitude, locationName }) => {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}&current_weather=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);

    const data = (await res.json()) as {
      current_weather: {
        temperature: number;
        windspeed: number;
        weathercode: number;
      };
    };

    const cw = data.current_weather;
    return {
      locationName,
      temperature_c: cw.temperature,
      windspeed_kmh: cw.windspeed,
      weathercode: cw.weathercode,
      description: interpretWeatherCode(cw.weathercode),
    };
  }
);

function interpretWeatherCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 9) return "Foggy";
  if (code <= 19) return "Drizzle";
  if (code <= 29) return "Rain";
  if (code <= 39) return "Snow";
  if (code <= 49) return "Freezing fog";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow / ice pellets";
  if (code <= 84) return "Rain showers";
  if (code <= 94) return "Thunderstorm";
  return "Thunderstorm with hail";
}
