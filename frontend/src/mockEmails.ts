export interface MockEmail {
  id: string;
  label: string;
  scenario: string;          // one-line description shown in the selector
  expectedOutcome: string;   // hint for testers
  body: string;
}

export const MOCK_EMAILS: MockEmail[] = [
  // ── 1. Large hospital order — credit limit exceeded ────────────────────────
  {
    id: "mock-001",
    label: "Northfield University Hospital — $3M Order Hold",
    scenario: "CREDIT header hold · $3,052,851 · Credit limit exceeded",
    expectedOutcome: "escalate / critical",
    body: `Hello Lisa Johnson,

Order 450017 for Northfield University Hospital has been placed on hold.

Hold details
Hold Type: CREDIT (header)
Reason Code: Credit limit exceeded
Status: Active
Created: Sept 04, 2025, 09:30:18 AM
Currency: USD
Order Value: $3,052,851
Entered By: Lisa Johnson

Impact
Order lines will not progress to pick/pack/ship while this hold is active.

Next steps
Contact Credit Management to review exposure and release criteria, or follow your standard credit-hold procedure.

You can view and manage holds from the Order Holds page.

Quick links
View Order: Oracle OM → Orders → 450017
Order Holds: Oracle OM → Orders → 450017 → Holds

This is an automated notification from Oracle Order Management. Please do not reply to this email.`,
  },

  // ── 2. Small tech startup — past-due balance ──────────────────────────────
  {
    id: "mock-002",
    label: "Velocity Tech Solutions — $42K Past-Due Hold",
    scenario: "CREDIT line hold · $42,500 · Past-due balance outstanding",
    expectedOutcome: "deny",
    body: `Hello Michael Chen,

Order 450389 for Velocity Tech Solutions has been placed on hold.

Hold details
Hold Type: CREDIT (line)
Reason Code: Past-due balance outstanding
Status: Active
Created: Sept 10, 2025, 02:15:44 PM
Currency: USD
Order Value: $42,500
Entered By: Sarah Williams

Impact
Lines 1 and 2 of Order 450389 are on hold and cannot proceed to fulfillment. Remaining lines are unaffected.

Past-due balance
Amount overdue: $18,340
Days overdue: 67
Last payment received: July 05, 2025

Next steps
Customer must clear past-due balance or provide a payment plan before this hold can be released.

You can view and manage holds from the Order Holds page.

This is an automated notification from Oracle Order Management. Please do not reply to this email.`,
  },

  // ── 3. Mid-size retailer — first-time slight overage ──────────────────────
  {
    id: "mock-003",
    label: "Summit Ridge Retail Group — $210K Minor Overage",
    scenario: "CREDIT header hold · $210,000 · 3.8 % over credit limit",
    expectedOutcome: "escalate / medium",
    body: `Hello David Park,

Order 450512 for Summit Ridge Retail Group has been placed on hold.

Hold details
Hold Type: CREDIT (header)
Reason Code: Credit limit exceeded
Status: Active
Created: Sept 12, 2025, 11:05:30 AM
Currency: USD
Order Value: $210,000
Approved Credit Limit: $202,500
Overage Amount: $7,500 (3.8% over limit)
Entered By: David Park

Customer note
This is Summit Ridge's first credit hold in 4 years of account history. Account has consistently paid within terms (Net 30).

Impact
All order lines are on hold. No pick/pack/ship activity will occur.

Next steps
Senior credit manager review recommended. Given clean payment history, temporary limit increase may be appropriate.

This is an automated notification from Oracle Order Management. Please do not reply to this email.`,
  },

  // ── 4. International customer — EUR currency risk ─────────────────────────
  {
    id: "mock-004",
    label: "Darmstadt Industrial GmbH — €1.4M Foreign Currency Hold",
    scenario: "CREDIT header hold · €1,400,000 EUR · New high-value account",
    expectedOutcome: "escalate / high",
    body: `Hello Anna Müller,

Order 450601 for Darmstadt Industrial GmbH has been placed on hold.

Hold details
Hold Type: CREDIT (header)
Reason Code: New customer — credit references pending
Status: Active
Created: Sept 15, 2025, 08:45:00 AM
Currency: EUR
Order Value: €1,400,000
USD Equivalent (approx.): $1,534,800
Entered By: Anna Müller

Customer profile
Account opened: Sept 01, 2025
Credit references submitted: 2 of 3 (awaiting response from Deutsche Bank)
Payment terms requested: Net 60

Impact
Entire order is on hold pending credit verification. No shipments can proceed.

Next steps
1. Obtain third credit reference from Deutsche Bank.
2. Assess foreign exchange exposure for EUR-denominated order.
3. Escalate to Regional Credit Director for approval above $1M USD equivalent.

This is an automated notification from Oracle Order Management. Please do not reply to this email.`,
  },

  // ── 5. Government agency — released hold (informational) ──────────────────
  {
    id: "mock-005",
    label: "Riverside County School District — $78K Released Hold",
    scenario: "CREDIT line hold · $78,200 · Hold already released",
    expectedOutcome: "release / low",
    body: `Hello Karen Torres,

Order 450298 for Riverside County School District has been updated.

Hold details
Hold Type: CREDIT (line)
Reason Code: Credit limit exceeded
Status: Released
Created: Aug 28, 2025, 03:20:10 PM
Released: Sept 02, 2025, 10:15:00 AM
Released By: Robert Kim (Credit Manager)
Currency: USD
Order Value: $78,200

Release notes
Customer provided purchase order number PO-2025-8841 referencing approved budget allocation. Credit limit temporarily extended by $25,000 per Finance Director approval on Sept 02, 2025.

Impact
All previously held lines have been released. Fulfillment can proceed immediately.

Next steps
No further action required. Order is clear to ship.

This is an automated notification from Oracle Order Management. Please do not reply to this email.`,
  },
];
