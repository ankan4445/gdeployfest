import { z } from "genkit";
import { ai } from "../ai.js";

// ── Schemas ───────────────────────────────────────────────────────────────────

export const CreditHoldInputSchema = z.object({
  email_body: z.string().describe("Raw credit hold notification email text"),
});

const ExtractedFieldsSchema = z.object({
  orderNumber:    z.string().describe("Order number / ID"),
  customerName:   z.string().describe("Customer / account name"),
  holdType:       z.string().describe("Type of hold, e.g. CREDIT (header), CREDIT (line)"),
  reasonCode:     z.string().describe("Reason code text"),
  orderValue:     z.number().describe("Order value as a plain number (no currency symbol)"),
  currency:       z.string().describe("3-letter currency code, e.g. USD"),
  status:         z.string().describe("Hold status, e.g. Active, Released"),
  createdAt:      z.string().describe("ISO-like date/time the hold was created"),
  enteredBy:      z.string().describe("Name of the person who created the hold"),
  impactSummary:  z.string().describe("One sentence describing the business impact"),
});

const ValidationStatusSchema = z.enum(["pass", "warning", "fail"]);

const ValidationCheckSchema = z.object({
  criterion:   z.string().describe("Short name of the validation criterion"),
  status:      ValidationStatusSchema,
  finding:     z.string().describe("One sentence describing what was found and why it passed/warned/failed"),
  action:      z.string().describe("Recommended action for this specific check"),
});

export const CreditHoldAnalysisSchema = z.object({
  extracted:       ExtractedFieldsSchema,
  validations:     z.array(ValidationCheckSchema),
  recommendation:  z.enum(["release", "escalate", "deny"]).describe("Overall credit decision"),
  urgency:         z.enum(["low", "medium", "high", "critical"]),
  summary:         z.string().describe("2-3 sentence overall analysis narrative"),
  nextSteps:       z.array(z.string()).describe("Ordered list of concrete actions to take"),
});

export type CreditHoldAnalysis = z.infer<typeof CreditHoldAnalysisSchema>;

// ── Validation criteria reference (injected into the system prompt) ───────────

const VALIDATION_CRITERIA = `
STANDARD CREDIT HOLD VALIDATION CRITERIA
Apply each of the following checks and record a status (pass/warning/fail) plus finding and action.

1. ORDER VALUE THRESHOLD
   pass    : < $50,000
   warning : $50,000 – $999,999
   fail    : ≥ $1,000,000 (executive approval required)

2. HOLD TYPE SEVERITY
   pass    : Administrative / payment-terms hold
   warning : CREDIT line hold (blocks specific lines only)
   fail    : CREDIT header hold (blocks entire order)

3. REASON CODE CLASSIFICATION
   pass    : First-time minor overage (< 5 % over limit)
   warning : Credit limit exceeded, new customer, or disputed invoice
   fail    : Past-due balance outstanding, repeated violations, or high-risk flag

4. HOLD STATUS
   pass    : Released
   warning : Pending review
   fail    : Active

5. CURRENCY RISK
   pass    : USD or home currency
   warning : Major foreign currency (EUR, GBP, JPY, etc.)
   fail    : Exotic / volatile currency

6. AUTHORIZATION LEVEL REQUIRED
   pass    : Standard credit team can release (< $100K)
   warning : Senior credit manager sign-off required ($100K – $999K)
   fail    : Executive / CFO approval required (≥ $1M)

7. IMPACT SCOPE
   pass    : No shipment lines affected
   warning : Partial shipment lines on hold
   fail    : All order lines blocked (no shipments can proceed)

Overall recommendation rules:
- recommendation = "release"  when most checks pass and no fails
- recommendation = "escalate" when there are warnings or a single fail
- recommendation = "deny"     when multiple fails, past-due balance, or fraud signals

Urgency rules:
- critical : ≥ $1M AND CREDIT header hold AND Active status
- high     : ≥ $500K OR CREDIT header hold
- medium   : $50K – $499K OR CREDIT line hold
- low      : < $50K AND no active header hold
`.trim();

// ── Flow ─────────────────────────────────────────────────────────────────────

export const creditHoldAnalysisFlow = ai.defineFlow(
  {
    name:         "creditHoldAnalysis",
    inputSchema:  CreditHoldInputSchema,
    outputSchema: CreditHoldAnalysisSchema,
  },
  async (input): Promise<CreditHoldAnalysis> => {
    // Step 1 — extract structured fields from the email
    const extractResult = await ai.generate({
      system: "You are an expert at parsing Oracle Order Management credit hold notification emails. Extract every named field accurately. If a field is missing from the email, use a sensible default (empty string or 0).",
      prompt: `Extract structured fields from the following credit hold email:\n\n${input.email_body}`,
      output: { schema: ExtractedFieldsSchema },
    });

    const extracted = extractResult.output;
    if (!extracted) throw new Error("creditHoldAnalysisFlow: extraction step returned no output");

    // Step 2 — apply validation criteria and generate recommendation
    const analysisResult = await ai.generate({
      system: `You are a senior credit analyst. Apply every validation criterion below exactly and produce a full structured analysis.

${VALIDATION_CRITERIA}`,
      prompt: `Here are the extracted fields from a credit hold email:
${JSON.stringify(extracted, null, 2)}

Apply all 7 validation criteria. For each, record:
- criterion  (short name from the list above)
- status     (pass / warning / fail)
- finding    (one sentence: what you found and why)
- action     (one sentence: what should happen next for this check)

Then set recommendation, urgency, summary, and nextSteps.`,
      output: { schema: CreditHoldAnalysisSchema.omit({ extracted: true }) },
    });

    const analysis = analysisResult.output;
    if (!analysis) throw new Error("creditHoldAnalysisFlow: analysis step returned no output");

    return { extracted, ...analysis };
  }
);
