param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath,

  [string]$CodexHome = (Join-Path $env:USERPROFILE ".codex"),

  [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ArchivePath)) {
  throw "Archive was not found: $ArchivePath"
}

$skillsRoot = Join-Path $CodexHome "skills"
New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-skills-import-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $tempRoot -Force

  $skillDirs = Get-ChildItem -LiteralPath $tempRoot -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md") }

  if (-not $skillDirs) {
    throw "No valid Codex skills were found in the archive."
  }

  foreach ($skillDir in $skillDirs) {
    $target = Join-Path $skillsRoot $skillDir.Name

    if ((Test-Path -LiteralPath $target) -and -not $Force) {
      Write-Warning "Skill already exists, skipping: $($skillDir.Name). Use -Force to overwrite."
      continue
    }

    if (Test-Path -LiteralPath $target) {
      Remove-Item -LiteralPath $target -Recurse -Force
    }

    Copy-Item -LiteralPath $skillDir.FullName -Destination $target -Recurse
    Write-Host "Imported skill: $($skillDir.Name)"
  }

  Write-Host "Restart Codex on this machine so the imported skills are loaded."
}
finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
