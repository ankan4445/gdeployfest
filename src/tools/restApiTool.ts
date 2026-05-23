import { z } from "genkit";
import { ai } from "../ai.js";

// Replace REST_API_BASE_URL and REST_API_KEY in .env with your real API.
// The model will construct the path and params based on the input text.
const REST_API_BASE = process.env.REST_API_BASE_URL ?? "https://api.example.com";
const REST_API_KEY = process.env.REST_API_KEY ?? "";

export const restApiTool = ai.defineTool(
  {
    name: "callRestApi",
    description:
      "Call an external REST API to fetch additional information about a topic or entity. " +
      "Use this when you need real-world data that the weather tool does not cover. " +
      `The base URL is ${REST_API_BASE}. Construct the path and query params based on what you need.`,
    inputSchema: z.object({
      path: z.string().describe("API path relative to the base URL, e.g. /v1/search or /users/lookup"),
      params: z
        .record(z.string())
        .optional()
        .describe("Query parameters as key-value string pairs"),
      method: z
        .enum(["GET", "POST"])
        .default("GET")
        .describe("HTTP method — use POST only when you need to send a request body"),
      body: z
        .record(z.unknown())
        .optional()
        .describe("Request body for POST requests"),
    }),
    outputSchema: z.object({
      status: z.number(),
      ok: z.boolean(),
      body: z.unknown().describe("Parsed JSON response, or raw text if not JSON"),
    }),
  },
  async ({ path, params, method, body }) => {
    const url = new URL(path, REST_API_BASE);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (REST_API_KEY) {
      headers["Authorization"] = `Bearer ${REST_API_KEY}`;
    }

    const init: RequestInit = { method, headers };
    if (method === "POST" && body) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url.toString(), init);
    const responseBody = await res.json().catch(() => res.text());

    return { status: res.status, ok: res.ok, body: responseBody };
  }
);
