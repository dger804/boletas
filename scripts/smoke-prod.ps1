param(
  [string]$FrontendUrl = "https://boletas.corporacionceer.com",
  [string]$ApiBaseUrl = "https://api-boletas.corporacionceer.com/api",
  [switch]$SkipDatabase
)

$ErrorActionPreference = "Stop"

function Join-Url {
  param(
    [string]$BaseUrl,
    [string]$Path
  )

  return "$($BaseUrl.TrimEnd('/'))/$($Path.TrimStart('/'))"
}

function Assert-StatusOk {
  param(
    [string]$Name,
    [Microsoft.PowerShell.Commands.WebResponseObject]$Response
  )

  if ($Response.StatusCode -lt 200 -or $Response.StatusCode -ge 300) {
    throw "$Name responded with HTTP $($Response.StatusCode)"
  }
}

function Invoke-SmokeRequest {
  param(
    [string]$Name,
    [string]$Url
  )

  Write-Host "Checking ${Name}: $Url"
  $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 30
  Assert-StatusOk -Name $Name -Response $response
  return $response
}

function Assert-JsonStatusOk {
  param(
    [string]$Name,
    [Microsoft.PowerShell.Commands.WebResponseObject]$Response
  )

  $payload = $Response.Content | ConvertFrom-Json
  if ($payload.status -ne "ok") {
    throw "$Name returned status '$($payload.status)'"
  }
}

function Assert-SecurityHeaders {
  param(
    [Microsoft.PowerShell.Commands.WebResponseObject]$Response
  )

  $expectedHeaders = @{
    "Content-Security-Policy" = "default-src 'none'; frame-ancestors 'none'"
    "Permissions-Policy" = "camera=(), microphone=(), geolocation=()"
    "Referrer-Policy" = "no-referrer"
    "X-Content-Type-Options" = "nosniff"
  }

  foreach ($header in $expectedHeaders.GetEnumerator()) {
    $actual = $Response.Headers[$header.Key]
    if ($actual -ne $header.Value) {
      throw "Expected header $($header.Key)='$($header.Value)' but found '$actual'"
    }
  }
}

$frontendResponse = Invoke-SmokeRequest -Name "frontend" -Url $FrontendUrl
if ([string]::IsNullOrWhiteSpace($frontendResponse.Content)) {
  throw "frontend returned an empty response"
}

$healthUrl = Join-Url -BaseUrl $ApiBaseUrl -Path "health"
$healthResponse = Invoke-SmokeRequest -Name "api health" -Url $healthUrl
Assert-JsonStatusOk -Name "api health" -Response $healthResponse
Assert-SecurityHeaders -Response $healthResponse

if (-not $SkipDatabase) {
  $databaseUrl = Join-Url -BaseUrl $ApiBaseUrl -Path "health/db"
  $databaseResponse = Invoke-SmokeRequest -Name "database health" -Url $databaseUrl
  Assert-JsonStatusOk -Name "database health" -Response $databaseResponse
}

Write-Host "Smoke check passed."
