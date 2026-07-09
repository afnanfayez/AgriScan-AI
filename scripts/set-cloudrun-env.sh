#!/usr/bin/env bash
# =============================================================================
# set-cloudrun-env.sh
# Sets ALL required environment variables for AgriScan AI on Google Cloud Run.
#
# Usage:
#   1. Fill in every value in the "CONFIGURATION" section below.
#   2. Run:  bash scripts/set-cloudrun-env.sh
#
# Requirements:
#   - Google Cloud SDK (gcloud) installed and authenticated
#   - gcloud auth login  &&  gcloud config set project YOUR_PROJECT_ID
# =============================================================================

set -euo pipefail

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
# Replace every placeholder value below before running this script.

PROJECT_ID="YOUR_PROJECT_ID"          # e.g. agriscan-ai-prod
SERVICE_NAME="YOUR_SERVICE_NAME"      # e.g. agriscan-ai   (find with: gcloud run services list)
REGION="YOUR_REGION"                  # e.g. europe-west1

GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="https://YOUR_CLOUD_RUN_URL"  # e.g. https://agriscan-ai-xxx.run.app

NEXT_PUBLIC_SUPABASE_URL="https://YOUR_SUPABASE_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

# Gmail SMTP  ─────────────────────────────────────────────────────────────────
# SMTP_PASS MUST be a Gmail App Password (NOT your regular Gmail password).
# Get one at: https://myaccount.google.com/apppasswords
# 2-Step Verification must be enabled on the Google account.
SMTP_USER="afnan232003@gmail.com"
SMTP_PASS="YOUR_NEW_16_CHAR_APP_PASSWORD"   # ← paste the app password here
SMTP_FROM="AgriScan AI <afnan232003@gmail.com>"

# ─── VALIDATION ───────────────────────────────────────────────────────────────
if [[ "$SMTP_PASS" == "YOUR_NEW_16_CHAR_APP_PASSWORD" ]]; then
  echo "❌  ERROR: You must replace SMTP_PASS with your real Gmail App Password."
  echo "    Get one at: https://myaccount.google.com/apppasswords"
  exit 1
fi

if [[ "$PROJECT_ID" == "YOUR_PROJECT_ID" || "$SERVICE_NAME" == "YOUR_SERVICE_NAME" ]]; then
  echo "❌  ERROR: Fill in PROJECT_ID and SERVICE_NAME before running this script."
  exit 1
fi

# ─── SET PROJECT ──────────────────────────────────────────────────────────────
echo "🔧  Setting project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

# ─── UPDATE ENV VARS ON CLOUD RUN ─────────────────────────────────────────────
echo ""
echo "🚀  Updating environment variables on Cloud Run service: $SERVICE_NAME ($REGION)"

gcloud run services update "$SERVICE_NAME" \
  --region "$REGION" \
  --update-env-vars \
"GEMINI_API_KEY=${GEMINI_API_KEY},\
APP_URL=${APP_URL},\
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL},\
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY},\
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},\
SMTP_USER=${SMTP_USER},\
SMTP_PASS=${SMTP_PASS},\
SMTP_FROM=${SMTP_FROM}"

# ─── VERIFY ───────────────────────────────────────────────────────────────────
echo ""
echo "✅  Done! Verifying variables set on the service..."
echo ""

gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format="table(spec.template.spec.containers[0].env[].name,spec.template.spec.containers[0].env[].value)"

echo ""
echo "────────────────────────────────────────────────"
echo "✅  All environment variables updated successfully."
echo "    Cloud Run will deploy a new revision automatically."
echo "────────────────────────────────────────────────"
