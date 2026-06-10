[CmdletBinding()]
param(
  [string]$DbHost = "srv565.hstgr.io",
  [int]$DbPort = 3306,
  [string]$DbName = "u198462083_boletasEventos",
  [string]$DbUser = "u198462083_boletasApp",
  [Parameter(Mandatory = $true)][string]$AdminEmail,
  [string]$AdminName = "Administrador",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Convert-ToDatabaseUrlPart {
  param([Parameter(Mandatory = $true)][string]$Value)

  return [System.Uri]::EscapeDataString($Value)
}

function Convert-SecureStringToPlainText {
  param([Parameter(Mandatory = $true)][securestring]$Value)

  $bstr = [IntPtr]::Zero

  try {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Create admin user"
Write-Host "Host: $DbHost"
Write-Host "Port: $DbPort"
Write-Host "Database: $DbName"
Write-Host "User: $DbUser"
Write-Host "Admin email: $AdminEmail"

if ($DryRun) {
  Write-Host "Dry run: no se pidieron contrasenas y no se creo usuario."
  exit 0
}

$databasePassword = Read-Host -Prompt "MySQL password" -AsSecureString
$adminPassword = Read-Host -Prompt "Admin password" -AsSecureString

$plainDatabasePassword = $null
$plainAdminPassword = $null

try {
  $plainDatabasePassword = Convert-SecureStringToPlainText -Value $databasePassword
  $plainAdminPassword = Convert-SecureStringToPlainText -Value $adminPassword

  $encodedUser = Convert-ToDatabaseUrlPart -Value $DbUser
  $encodedPassword = Convert-ToDatabaseUrlPart -Value $plainDatabasePassword
  $env:DATABASE_URL = "mysql://${encodedUser}:${encodedPassword}@${DbHost}:${DbPort}/${DbName}"
  $env:AUTH_ADMIN_EMAIL = $AdminEmail
  $env:AUTH_ADMIN_NAME = $AdminName
  $env:AUTH_ADMIN_PASSWORD = $plainAdminPassword

  Push-Location $repoRoot
  try {
    & pnpm.cmd auth:create-admin

    if ($LASTEXITCODE -ne 0) {
      throw "pnpm auth:create-admin failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }

  Write-Host "Admin user created or updated."
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:AUTH_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:AUTH_ADMIN_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:AUTH_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  $plainDatabasePassword = $null
  $plainAdminPassword = $null
}
