# ============================================================================
# Setup Jira Service Management Secrets in GCP Secret Manager for Cloud Run
# ============================================================================
# Usage:
#   .\scripts\setup-jira-secrets.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$PROJECT_ID = "team-organiser-prod"
$REGION     = "europe-west1"
$SERVICES   = @("team-organiser-api", "backend-api-beta")

$JIRA_USER_EMAIL = Read-Host "Enter JIRA_USER_EMAIL (Atlassian account email)"
$JIRA_API_TOKEN  = Read-Host "Enter JIRA_API_TOKEN (Atlassian API token)"

if ([string]::IsNullOrWhiteSpace($JIRA_USER_EMAIL) -or [string]::IsNullOrWhiteSpace($JIRA_API_TOKEN)) {
    Write-Error "Both JIRA_USER_EMAIL and JIRA_API_TOKEN must be provided."
    exit 1
}

Write-Host "`n1. Setting active GCP project to $PROJECT_ID..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

Write-Host "`n2. Enabling Secret Manager API..." -ForegroundColor Cyan
gcloud services enable secretmanager.googleapis.com

function Set-GcpSecret {
    param (
        [string]$SecretName,
        [string]$SecretValue
    )

    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($tempFile, $SecretValue.Trim(), $utf8NoBom)

        gcloud secrets describe $SecretName --project=$PROJECT_ID *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   Updating existing secret: $SecretName" -ForegroundColor Yellow
            gcloud secrets versions add $SecretName --data-file="$tempFile" --project=$PROJECT_ID
        } else {
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

Write-Host "`n3. Storing Jira secrets in Secret Manager..." -ForegroundColor Cyan
Set-GcpSecret -SecretName "JIRA_USER_EMAIL" -SecretValue $JIRA_USER_EMAIL
Set-GcpSecret -SecretName "JIRA_API_TOKEN" -SecretValue $JIRA_API_TOKEN

Write-Host "`n4. Granting Cloud Run service account access to read secrets..." -ForegroundColor Cyan
$PROJECT_NUMBER = (gcloud projects describe $PROJECT_ID --format="value(projectNumber)").Trim()
$RUNTIME_SA = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

foreach ($secret in @("JIRA_USER_EMAIL", "JIRA_API_TOKEN")) {
    gcloud secrets add-iam-policy-binding $secret `
        --member="serviceAccount:$RUNTIME_SA" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID *> $null
    Write-Host "   Granted secretAccessor on $secret to $RUNTIME_SA" -ForegroundColor Green
}

foreach ($svc in $SERVICES) {
    Write-Host "`n5. Mounting Jira secrets onto Cloud Run service ($svc)..." -ForegroundColor Cyan
    gcloud run services update $svc `
        --region=$REGION `
        --update-env-vars="JIRA_HOST=subshuffle.atlassian.net" `
        --update-secrets="JIRA_USER_EMAIL=JIRA_USER_EMAIL:latest,JIRA_API_TOKEN=JIRA_API_TOKEN:latest" `
        --project=$PROJECT_ID
}

Write-Host "`nDone! Your Jira Service Management secrets are now persisted in Secret Manager and mounted on Cloud Run." -ForegroundColor Green

