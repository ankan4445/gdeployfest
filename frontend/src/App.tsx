import { useState } from "react";
import { MOCK_EMAILS, type MockEmail } from "./mockEmails.ts";
import styles from "./App.module.css";

// ── Types (mirrors backend CreditHoldAnalysisSchema) ────────────────────────

type ValidationStatus = "pass" | "warning" | "fail";
type Recommendation   = "release" | "escalate" | "deny";
type Urgency          = "low" | "medium" | "high" | "critical";

interface ValidationCheck {
  criterion: string;
  status:    ValidationStatus;
  finding:   string;
  action:    string;
}

interface ExtractedFields {
  orderNumber:   string;
  customerName:  string;
  holdType:      string;
  reasonCode:    string;
  orderValue:    number;
  currency:      string;
  status:        string;
  createdAt:     string;
  enteredBy:     string;
  impactSummary: string;
}

interface CreditHoldAnalysis {
  extracted:      ExtractedFields;
  validations:    ValidationCheck[];
  recommendation: Recommendation;
  urgency:        Urgency;
  summary:        string;
  nextSteps:      string[];
}

// ── Config maps ───────────────────────────────────────────────────────────────

const RECOMMENDATION_CFG: Record<Recommendation, { label: string; color: string; bg: string; border: string; icon: string }> = {
  release:  { label: "Release Hold",         color: "#166534", bg: "#dcfce7", border: "#86efac", icon: "✓" },
  escalate: { label: "Escalate for Review",  color: "#92400e", bg: "#fef3c7", border: "#fcd34d", icon: "!" },
  deny:     { label: "Deny Credit",          color: "#991b1b", bg: "#fee2e2", border: "#fca5a5", icon: "✕" },
};

const URGENCY_CFG: Record<Urgency, { label: string; color: string; dot: string }> = {
  low:      { label: "Low",      color: "#6b7280", dot: "#9ca3af" },
  medium:   { label: "Medium",   color: "#d97706", dot: "#f59e0b" },
  high:     { label: "High",     color: "#dc2626", dot: "#ef4444" },
  critical: { label: "Critical", color: "#7c3aed", dot: "#8b5cf6" },
};

const VALIDATION_CFG: Record<ValidationStatus, { icon: string; color: string; bg: string }> = {
  pass:    { icon: "✓", color: "#166534", bg: "#f0fdf4" },
  warning: { icon: "!", color: "#92400e", bg: "#fffbeb" },
  fail:    { icon: "✕", color: "#991b1b", bg: "#fff5f5" },
};

// ── Component ─────────────────────────────────────────────────────────────────

type Step = "input" | "loading" | "result";

export default function App() {
  const [step, setStep]           = useState<Step>("input");
  const [emailBody, setEmailBody] = useState(MOCK_EMAILS[0].body);
  const [selectedId, setSelectedId] = useState<string>(MOCK_EMAILS[0].id);
  const [result, setResult]       = useState<CreditHoldAnalysis | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  function pickMock(mock: MockEmail) {
    setSelectedId(mock.id);
    setEmailBody(mock.body);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailBody.trim()) return;

    setStep("loading");
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/credit-hold-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_body: emailBody }),
      });

      const data = await res.json() as CreditHoldAnalysis & { error?: string };

      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
        setStep("input");
        return;
      }

      setResult(data);
      setStep("result");
    } catch {
      setError("Could not reach the server. Make sure the backend is running on port 8080.");
      setStep("input");
    }
  }

  function handleReset() {
    setStep("input");
    setResult(null);
    setError(null);
    setExpandedRow(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const recCfg     = result ? RECOMMENDATION_CFG[result.recommendation] : null;
  const urgCfg     = result ? URGENCY_CFG[result.urgency] : null;
  const passCount  = result?.validations.filter(v => v.status === "pass").length    ?? 0;
  const warnCount  = result?.validations.filter(v => v.status === "warning").length ?? 0;
  const failCount  = result?.validations.filter(v => v.status === "fail").length    ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className={styles.header}>
          <span className={styles.headerIcon}>📋</span>
          <div>
            <h1 className={styles.title}>Credit Hold Analyzer</h1>
            <p className={styles.subtitle}>AI-powered validation against standard credit hold criteria</p>
          </div>
        </header>

        {/* ── Input step ───────────────────────────────────────────────────── */}
        {step === "input" && (
          <form onSubmit={handleSubmit} className={styles.form}>

            {/* Mock email selector */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Load sample email</p>
              <div className={styles.mockGrid}>
                {MOCK_EMAILS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles.mockCard} ${selectedId === m.id ? styles.mockCardActive : ""}`}
                    onClick={() => pickMock(m)}
                  >
                    <span className={styles.mockLabel}>{m.label}</span>
                    <span className={styles.mockScenario}>{m.scenario}</span>
                    <span className={styles.mockOutcome}>Expected: {m.expectedOutcome}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email textarea */}
            <div className={styles.section}>
              <label className={styles.sectionLabel} htmlFor="emailBody">
                Email body
              </label>
              <textarea
                id="emailBody"
                className={styles.textarea}
                value={emailBody}
                onChange={(e) => { setEmailBody(e.target.value); setSelectedId(""); }}
                placeholder="Paste a credit hold notification email here…"
                rows={12}
                required
              />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button className={styles.primaryBtn} type="submit" disabled={!emailBody.trim()}>
              Run Credit Hold Analysis
            </button>
          </form>
        )}

        {/* ── Loading step ─────────────────────────────────────────────────── */}
        {step === "loading" && (
          <div className={styles.loadingState}>
            <span className={styles.bigSpinner} />
            <p className={styles.loadingTitle}>Analyzing credit hold…</p>
            <p className={styles.loadingSubtitle}>Extracting fields · Running 7 validation checks</p>
          </div>
        )}

        {/* ── Result step ──────────────────────────────────────────────────── */}
        {step === "result" && result && recCfg && urgCfg && (
          <div className={styles.result}>

            {/* Decision banner */}
            <div
              className={styles.decisionBanner}
              style={{ background: recCfg.bg, borderColor: recCfg.border, color: recCfg.color }}
            >
              <span className={styles.decisionIcon}>{recCfg.icon}</span>
              <div className={styles.decisionText}>
                <span className={styles.decisionLabel}>{recCfg.label}</span>
                <span
                  className={styles.urgencyPill}
                  style={{ color: urgCfg.color }}
                >
                  <span className={styles.urgencyDot} style={{ background: urgCfg.dot }} />
                  {urgCfg.label} urgency
                </span>
              </div>
            </div>

            {/* Extracted fields */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Extracted order details</h2>
              <div className={styles.fieldsGrid}>
                {(
                  [
                    ["Order #",        result.extracted.orderNumber],
                    ["Customer",       result.extracted.customerName],
                    ["Hold type",      result.extracted.holdType],
                    ["Reason code",    result.extracted.reasonCode],
                    ["Order value",    `${result.extracted.currency} ${result.extracted.orderValue.toLocaleString()}`],
                    ["Status",         result.extracted.status],
                    ["Created",        result.extracted.createdAt],
                    ["Entered by",     result.extracted.enteredBy],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className={styles.fieldCell}>
                    <span className={styles.fieldKey}>{k}</span>
                    <span className={styles.fieldVal}>{v}</span>
                  </div>
                ))}
              </div>
              <p className={styles.impactNote}>
                <strong>Impact:</strong> {result.extracted.impactSummary}
              </p>
            </section>

            {/* Validation summary bar */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Validation checks
                <span className={styles.checkCounts}>
                  <span className={styles.countPass}>{passCount} pass</span>
                  <span className={styles.countWarn}>{warnCount} warning</span>
                  <span className={styles.countFail}>{failCount} fail</span>
                </span>
              </h2>
              <div className={styles.validationTable}>
                {result.validations.map((v, i) => {
                  const cfg = VALIDATION_CFG[v.status];
                  const open = expandedRow === i;
                  return (
                    <div
                      key={i}
                      className={`${styles.validationRow} ${open ? styles.validationRowOpen : ""}`}
                      style={{ background: cfg.bg }}
                    >
                      <button
                        type="button"
                        className={styles.validationHeader}
                        onClick={() => setExpandedRow(open ? null : i)}
                        aria-expanded={open}
                      >
                        <span className={styles.statusIcon} style={{ color: cfg.color }}>
                          {cfg.icon}
                        </span>
                        <span className={styles.criterionName}>{v.criterion}</span>
                        <span className={styles.statusLabel} style={{ color: cfg.color }}>
                          {v.status.toUpperCase()}
                        </span>
                        <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
                      </button>
                      {open && (
                        <div className={styles.validationDetail}>
                          <p className={styles.validationFinding}>{v.finding}</p>
                          <p className={styles.validationAction}>
                            <strong>Action:</strong> {v.action}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Summary + next steps */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Analysis summary</h2>
              <p className={styles.summaryText}>{result.summary}</p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Next steps</h2>
              <ol className={styles.nextStepsList}>
                {result.nextSteps.map((step, i) => (
                  <li key={i} className={styles.nextStepItem}>{step}</li>
                ))}
              </ol>
            </section>

            <button className={styles.resetBtn} onClick={handleReset}>
              ← Analyze another email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
