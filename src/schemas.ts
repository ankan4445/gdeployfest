import { z } from "genkit";

export const AnalyzeInputSchema = z.object({
  text: z.string().describe("The text to analyze and enrich with external data"),
  context: z.string().optional().describe("Optional domain hint (e.g. 'finance', 'weather', 'news')"),
});
export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

export const EnrichmentSchema = z.object({
  source: z.string().describe("Name of the tool or API that provided this data"),
  data: z.record(z.unknown()).describe("Raw data returned by the external system"),
});

export const EnrichedOutputSchema = z.object({
  summary: z.string().describe("Brief summary of what the input text is about"),
  entities: z.array(z.string()).describe("Key entities (people, places, concepts) found in the text"),
  enrichments: z.array(EnrichmentSchema).describe("Data fetched from external systems"),
  synthesis: z.string().describe("Final insight combining the original text with the external data"),
});
export type EnrichedOutput = z.infer<typeof EnrichedOutputSchema>;
