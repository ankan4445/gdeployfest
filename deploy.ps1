# Deploy gdeployfest to Google Cloud Run (PowerShell)
# Usage:
#   $env:GOOGLE_API_KEY = "your-key"; .\deploy.ps1
#   $env:GOOGLE_API_KEY = "your-key"; $env:REGION = "us-east1"; .\deploy.ps1
param(
    [string]$Region  = ($env:REGION  ?? "us-central1"),
    [string]$Service = ($env:SERVICE ?? "gdeployfest")
)

$ErrorActionPreference = "Stop"

# ── Pre-flight checks ──────────────────────────────────────────────────────────
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud CLI not found. Install from https://cloud.google.com/sdk/docs/install"
    exit 1
}

$Project = (gcloud config get-value project 2>$null).Trim()
if (-not $Project) {
    Write-Error "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
}

if (-not $env:GOOGLE_API_KEY) {
    Write-Error "GOOGLE_API_KEY is not set. Run: `$env:GOOGLE_API_KEY = 'your-key'"
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Project : $Project"
Write-Host "  Region  : $Region"
Write-Host "  Service : $Service"
Write-Host "================================================" -ForegroundColor Cyan

# ── Enable required APIs ────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[1/3] Enabling Cloud Run and Cloud Build APIs..." -ForegroundColor Yellow
gcloud services enable `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    --project $Project `
    --quiet

# ── Build and deploy ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/3] Building image and deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host "      (Multi-stage Docker build via Cloud Build — ~3 min)"

gcloud run deploy $Service `
    --source . `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --port 8080 `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 5 `
    --timeout 120 `
    --set-env-vars "GOOGLE_API_KEY=$($env:GOOGLE_API_KEY)" `
    --project $Project `
    --quiet

# ── Print the URL ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/3] Fetching service URL..." -ForegroundColor Yellow

$Url = (gcloud run services describe $Service `
    --region $Region `
    --project $Project `
    --format "value(status.url)").Trim()

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Deployed successfully!" -ForegroundColor Green
Write-Host "  URL: $Url" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test endpoints:"
Write-Host "  GET  $Url/health"
Write-Host "  POST $Url/credit-hold-analysis"
Write-Host ""
Write-Host "Open the app: $Url"
