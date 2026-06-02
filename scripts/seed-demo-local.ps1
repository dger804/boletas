[CmdletBinding()]
param(
  [string]$DbHost = "srv565.hstgr.io",
  [int]$DbPort = 3306,
  [string]$DbName = "u198462083_boletasEventos",
  [string]$DbUser = "u198462083_boletasApp",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Convert-ToDatabaseUrlPart {
  param([Parameter(Mandatory = $true)][string]$Value)

  return [System.Uri]::EscapeDataString($Value)
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Seed demo local"
Write-Host "Host: $DbHost"
Write-Host "Port: $DbPort"
Write-Host "Database: $DbName"
Write-Host "User: $DbUser"

if ($DryRun) {
  Write-Host "Dry run: no se pidio contrasena y no se ejecuto el seed."
  exit 0
}

$password = Read-Host -Prompt "MySQL password" -AsSecureString
$passwordBstr = [IntPtr]::Zero
$plainPassword = $null

try {
  $passwordBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordBstr)

  $encodedUser = Convert-ToDatabaseUrlPart -Value $DbUser
  $encodedPassword = Convert-ToDatabaseUrlPart -Value $plainPassword
  $env:DATABASE_URL = "mysql://${encodedUser}:${encodedPassword}@${DbHost}:${DbPort}/${DbName}"

  Push-Location $repoRoot
  try {
    & pnpm.cmd db:seed

    if ($LASTEXITCODE -ne 0) {
      throw "pnpm db:seed failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }

  Write-Host "Seed demo finalizado."
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue

  if ($passwordBstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordBstr)
  }

  $plainPassword = $null
}
