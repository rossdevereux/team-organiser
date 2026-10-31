# ============================================================================
# Setup Stripe Secrets in Google Cloud Secret Manager for Cloud Run
# ============================================================================
# Usage:
#   .\scripts\setup-stripe-secrets.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

# 1. Configuration
$PROJECT_ID = "team-organiser-prod"
$REGION = "europe-west1"
$SERVICE_NAME = "team-organiser-api"

# Prompt securely for Stripe keys
$STRIPE_SECRET_KEY = Read-Host "Enter STRIPE_SECRET_KEY (e.g. sk_live_...)"
$STRIPE_WEBHOOK_SECRET = Read-Host "Enter STRIPE_WEBHOOK_SECRET (e.g. whsec_...)"

if ([string]::IsNullOrWhiteSpace($STRIPE_SECRET_KEY) -or [string]::IsNullOrWhiteSpace($STRIPE_WEBHOOK_SECRET)) {
    Write-Error "Both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be provided."
    exit 1
}

Write-Host "`n1. Setting active GCP project to $PROJECT_ID..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

Write-Host "`n2. Enabling Secret Manager API..." -ForegroundColor Cyan
gcloud services enable secretmanager.googleapis.com

# Helper function to create or update a secret without trailing CRLF newlines
function Set-GcpSecret {
    param (
        [string]$SecretName,
        [string]$SecretValue
    )

    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        # Write exact UTF-8 bytes without BOM or trailing newline
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tempFile, $SecretValue.Trim(), $utf8NoBom)

        # Check if secret already exists
        gcloud secrets describe $SecretName --project=$PROJECT_ID *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   Updating existing secret: $SecretName" -ForegroundColor Yellow
            gcloud secrets versions add $SecretName --data-file="$tempFile" --project=$PROJECT_ID
        }
        else {
            Write-Host "   Creating new secret: $SecretName" -ForegroundColor Green
            gcloud secrets create $SecretName --replication-policy="automatic" --data-file="$tempFile" --project=$PROJECT_ID
        }
    }
    finally {
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force
        }
    }
}

Write-Host "`n3. Storing Stripe secrets in Secret Manager..." -ForegroundColor Cyan
Set-GcpSecret -SecretName "STRIPE_SECRET_KEY" -SecretValue $STRIPE_SECRET_KEY
Set-GcpSecret -SecretName "STRIPE_WEBHOOK_SECRET" -SecretValue $STRIPE_WEBHOOK_SECRET

Write-Host "`n4. Granting Cloud Run service account access to read secrets..." -ForegroundColor Cyan
$PROJECT_NUMBER = (gcloud projects describe $PROJECT_ID --format="value(projectNumber)").Trim()
$RUNTIME_SA = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

foreach ($secret in @("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET")) {
    gcloud secrets add-iam-policy-binding $secret `
        --member="serviceAccount:$RUNTIME_SA" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID *> $null
    Write-Host "   Granted secretAccessor on $secret to $RUNTIME_SA" -ForegroundColor Green
}

Write-Host "`n5. Clearing any plain-text env vars with the same names (if present)..." -ForegroundColor Cyan
gcloud run services update $SERVICE_NAME `
    --region=$REGION `
    --remove-env-vars="STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET" `
    --project=$PROJECT_ID

Write-Host "`n6. Mounting secrets onto Cloud Run service ($SERVICE_NAME)..." -ForegroundColor Cyan
gcloud run services update $SERVICE_NAME `
    --region=$REGION `
    --update-secrets="STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest" `
    --project=$PROJECT_ID

Write-Host "`nDone! Your Stripe secrets are now persisted in Secret Manager and mounted on Cloud Run." -ForegroundColor Green
