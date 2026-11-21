param(
    [ValidateSet("show", "bump", "set")]
    [string]$Action = "show",

    [ValidateSet("", "patch", "minor", "major")]
    [string]$Part = "patch",

    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
$PackageJsonPath = Join-Path $ProjectDir "package.json"
$PackageLockPath = Join-Path $ProjectDir "package-lock.json"
$VersionTsPath = [System.IO.Path]::Combine($ProjectDir, "src", "version.ts")

if (-not (Test-Path $PackageJsonPath)) {
    throw "No se encontró '$PackageJsonPath'."
}

$PkgContent = Get-Content -Path $PackageJsonPath -Raw
if ($PkgContent -notmatch '"version"\s*:\s*"([^"]+)"') {
    throw "No se encontró el campo version en '$PackageJsonPath'."
}
$CurrentVersion = $Matches[1]

$SemVerRegex = '^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$'

if ($Action -eq "show") {
    Write-Output $CurrentVersion
    exit 0
}

if ($Action -eq "set") {
    if ([string]::IsNullOrWhiteSpace($Version) -or ($Version -notmatch $SemVerRegex)) {
        throw "La versión '$Version' no cumple con el formato SemVer (MAJOR.MINOR.PATCH)."
    }
    $NewVersion = $Version
}
elseif ($Action -eq "bump") {
    if ($CurrentVersion -notmatch $SemVerRegex) {
        throw "La versión actual '$CurrentVersion' no cumple con SemVer."
    }
    $Major = [int]$Matches[1]
    $Minor = [int]$Matches[2]
    $Patch = [int]$Matches[3]

    switch ($Part) {
        "major" {
            $Major++
            $Minor = 0
            $Patch = 0
        }
        "minor" {
            $Minor++
            $Patch = 0
        }
        default {
            $Patch++
        }
    }
    $NewVersion = "$Major.$Minor.$Patch"
}

# 1. Actualizar package.json
$PkgRegex = [regex]'("version"\s*:\s*)"[^"]+"'
$UpdatedPkg = $PkgRegex.Replace($PkgContent, "`${1}`"$NewVersion`"", 1)
Set-Content -Path $PackageJsonPath -Value $UpdatedPkg -NoNewline -Encoding UTF8

# 2. Actualizar package-lock.json (solo las 2 primeras ocurrencias: raíz y packages[""])
if (Test-Path $PackageLockPath) {
    $LockContent = Get-Content -Path $PackageLockPath -Raw
    $UpdatedLock = $PkgRegex.Replace($LockContent, "`${1}`"$NewVersion`"", 2)
    Set-Content -Path $PackageLockPath -Value $UpdatedLock -NoNewline -Encoding UTF8
}

# 3. Actualizar src/version.ts
if (Test-Path $VersionTsPath) {
    $TsContent = Get-Content -Path $VersionTsPath -Raw
    $TsRegex = [regex]('(APP_VERSION\s*=\s*)' + "'" + '[^' + "'" + ']+' + "'")
    $UpdatedTs = $TsRegex.Replace($TsContent, "`${1}'$NewVersion'", 1)
    Set-Content -Path $VersionTsPath -Value $UpdatedTs -NoNewline -Encoding UTF8
}

Write-Host "✓ [npf-web-core-manager] Versión actualizada: $CurrentVersion -> $NewVersion" -ForegroundColor Green
Write-Output $NewVersion
