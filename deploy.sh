#!/usr/bin/env bash
# Deploy gdeployfest to Google Cloud Run.
# Usage:
#   GOOGLE_API_KEY=<your-key> ./deploy.sh
#   GOOGLE_API_KEY=<key> REGION=us-east1 SERVICE=my-service ./deploy.sh
set -euo pipefail

# ── Config (override with env vars) ──────────────────────────────────────────
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-gdeployfest}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if ! command -v gcloud &>/dev/null; then
  echo "ERROR: gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install"
  exit 1
fi

PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ -z "$PROJECT" ]]; then
  echo "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

if [[ -z "${GOOGLE_API_KEY:-}" ]]; then
  echo "ERROR: GOOGLE_API_KEY is not set."
  echo "  Export it before running: export GOOGLE_API_KEY=your-key"
  exit 1
fi

echo "================================================"
echo "  Project : $PROJECT"
echo "  Region  : $REGION"
echo "  Service : $SERVICE"
echo "================================================"

# ── Enable required APIs (idempotent) ─────────────────────────────────────────
echo ""
echo "[1/3] Enabling Cloud Run and Cloud Build APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  --project "$PROJECT" \
  --quiet

# ── Build and deploy ──────────────────────────────────────────────────────────
echo ""
echo "[2/3] Building image and deploying to Cloud Run..."
echo "      (This runs a multi-stage Docker build via Cloud Build — takes ~3 min)"

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --timeout 120 \
  --set-env-vars "GOOGLE_API_KEY=${GOOGLE_API_KEY}" \
  --project "$PROJECT" \
  --quiet

# ── Print the URL ─────────────────────────────────────────────────────────────
echo ""
echo "[3/3] Fetching service URL..."
URL=$(gcloud run services describe "$SERVICE" \
  --region "$REGION" \
  --project "$PROJECT" \
  --format "value(status.url)")

echo ""
echo "================================================"
echo "  Deployed successfully!"
echo "  URL: $URL"
echo "================================================"
echo ""
echo "Test endpoints:"
echo "  GET  $URL/health"
echo "  POST $URL/credit-hold-analysis"
echo ""
echo "Open the app: $URL"
