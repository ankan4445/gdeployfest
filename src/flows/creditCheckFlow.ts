import { z } from "genkit";
import { ai } from "../ai.js";
import { restApiTool } from "../tools/restApiTool.js";

export const CreditCheckInputSchema = z.object({
  requestedAmount: z.number().positive().describe("Extra credit amount requested"),
});

export const CreditCheckOutputSchema = z.object({
  decision: z.enum(["approved", "denied", "review"]).describe("Credit decision"),
  reason: z.string().describe("One-sentence explanation of the decision"),
  details: z.string().describe("Longer analysis supporting the decision"),
});

export type CreditCheckOutput = z.infer<typeof CreditCheckOutputSchema>;

export const creditCheckFlow = ai.defineFlow(
  {
    name: "creditCheck",
    inputSchema: CreditCheckInputSchema,
    outputSchema: CreditCheckOutputSchema,
  },
  async (input): Promise<CreditCheckOutput> => {
    const { output } = await ai.generate({
      system: `You are a credit risk analyst. A customer is requesting extra credit.
Use any available tools to gather relevant information (credit history, risk data, etc.).
Then issue a clear decision: "approved", "denied", or "review" (needs manual review).
Be conservative: if data is insufficient or the amount seems risky, choose "review".`,
      prompt: `Credit check request: customer is asking for $${input.requestedAmount.toLocaleString()} in additional credit.

Use available tools to assess risk if applicable, then return a structured JSON decision with:
- decision: "approved" | "denied" | "review"
- reason: one sentence
- details: 2-3 sentence analysis`,
      tools: [restApiTool],
      output: { schema: CreditCheckOutputSchema },
    });

    if (!output) throw new Error("creditCheckFlow: no output from model");
    return output;
  }
);
