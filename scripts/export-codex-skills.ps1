param(
  [string]$Destination = (Join-Path (Get-Location) "_portable\codex-skills.zip"),
  [string]$CodexHome = (Join-Path $env:USERPROFILE ".codex"),
  [string[]]$OnlySkillName = @()
)

$ErrorActionPreference = "Stop"

$skillsRoot = Join-Path $CodexHome "skills"
if (-not (Test-Path -LiteralPath $skillsRoot)) {
  throw "Codex skills directory was not found: $skillsRoot"
}

$skillNames = New-Object System.Collections.Generic.List[string]

if ($PSBoundParameters.ContainsKey("OnlySkillName") -and $OnlySkillName.Count -gt 0) {
  foreach ($name in $OnlySkillName) {
    if (-not [string]::IsNullOrWhiteSpace($name)) {
      $skillNames.Add($name.Trim()) | Out-Null
    }
  }
}
else {
  foreach ($directory in Get-ChildItem -LiteralPath $skillsRoot -Directory) {
    if (-not $directory.Name.StartsWith(".")) {
      $skillNames.Add($directory.Name) | Out-Null
    }
  }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-skills-export-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  $copied = @()

  foreach ($currentSkillName in $skillNames) {
    $source = Join-Path $skillsRoot $currentSkillName
    if (-not (Test-Path -LiteralPath $source)) {
      Write-Warning "Skill not found, skipping: $currentSkillName"
      continue
    }

    Copy-Item -LiteralPath $source -Destination (Join-Path $tempRoot $currentSkillName) -Recurse
    $copied += $currentSkillName
  }

  if ($copied.Count -eq 0) {
    throw "No skills were copied. Nothing to export."
  }

  $manifest = @(
    "Codex skills export",
    "CreatedAt=$((Get-Date).ToString("s"))",
    "Source=$skillsRoot",
    "Skills=$($copied -join ", ")",
    "",
    "This archive intentionally excludes dot-prefixed system skills, plugin cache, node_modules, repo files, .env files, and secrets."
  )
  Set-Content -Path (Join-Path $tempRoot "MANIFEST.txt") -Value $manifest -Encoding UTF8

  $destinationParent = Split-Path -Parent $Destination
  if ($destinationParent) {
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  }

  Compress-Archive -Path (Join-Path $tempRoot "*") -DestinationPath $Destination -Force
  Write-Host "Codex skills export created: $Destination"
}
finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
