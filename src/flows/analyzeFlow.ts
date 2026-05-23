import { z } from "genkit";
import { ai } from "../ai.js";
import { AnalyzeInputSchema, EnrichedOutputSchema, type EnrichedOutput } from "../schemas.js";
import { weatherTool } from "../tools/weatherTool.js";
import { restApiTool } from "../tools/restApiTool.js";

export const analyzeFlow = ai.defineFlow(
  {
    name: "analyzeText",
    inputSchema: AnalyzeInputSchema,
    outputSchema: EnrichedOutputSchema,
  },
  async (input): Promise<EnrichedOutput> => {
    // Step 1: use tools to gather external data based on the text
    const gatherResult = await ai.generate({
      system: `You are an expert analyst with access to external data tools.
When given text, identify key entities and topics, then use the available tools to fetch
relevant real-world data for each. Call as many tools as needed — one per entity or topic.
After gathering data, stop and return a JSON summary with these fields:
- entities: string[] — key entities you found
- enrichments: { source: string, data: object }[] — one entry per tool call result`,
      prompt: `Analyze the following text${input.context ? ` (domain hint: ${input.context})` : ""}:

${input.text}

Use tools to enrich the analysis. Return JSON only.`,
      tools: [weatherTool, restApiTool],
      output: {
        schema: z.object({
          entities: z.array(z.string()),
          enrichments: z.array(
            z.object({
              source: z.string(),
              data: z.record(z.unknown()),
            })
          ),
        }),
      },
    });

    const gathered = gatherResult.output ?? { entities: [], enrichments: [] };

    // Step 2: synthesize everything into a final structured report
    const synthesisResult = await ai.generate({
      system: "You are a concise analytical writer. Produce structured JSON reports.",
      prompt: `Given the original text and the external data collected, produce a final enriched report.

Original text: ${input.text}

Entities found: ${gathered.entities.join(", ")}

External data collected:
${JSON.stringify(gathered.enrichments, null, 2)}

Return a JSON object with:
- summary: one-paragraph overview of the text
- entities: the list of key entities
- enrichments: the data above (pass it through unchanged)
- synthesis: 2-3 sentences combining the original text with the external data as a final insight`,
      output: { schema: EnrichedOutputSchema },
    });

    if (!synthesisResult.output) {
      throw new Error("analyzeFlow: synthesis step returned no output");
    }

    return synthesisResult.output;
  }
);
