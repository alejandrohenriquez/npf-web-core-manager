param(
    [string]$Version = "",
    [ValidateSet("", "patch", "minor", "major")]
    [string]$Bump = "",
    [string]$Platform = "linux/arm64",
    [string]$DestinationDir = "\\192.168.31.30\docker\np-factory\images",
    [switch]$KeepLocalTar
)

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
$SemVerScript = Join-Path $PSScriptRoot "semver.ps1"
$PackageJsonPath = Join-Path $ProjectDir "package.json"

if (-not (Test-Path $PackageJsonPath)) {
    throw "No se encontró package.json en '$ProjectDir'."
}

if (-not [string]::IsNullOrWhiteSpace($Bump)) {
    $Version = (& $SemVerScript -Action bump -Part $Bump | Select-Object -Last 1).Trim()
}
elseif (-not [string]::IsNullOrWhiteSpace($Version)) {
    $Version = (& $SemVerScript -Action set -Version $Version | Select-Object -Last 1).Trim()
}
else {
    $Version = (& $SemVerScript -Action show | Select-Object -Last 1).Trim()
}

$PkgContent = Get-Content -Path $PackageJsonPath -Raw
$ImageName = "npf-web-core-manager"
if ($PkgContent -match '"name"\s*:\s*"([^"]+)"') {
    $ImageName = $Matches[1]
}

$PlatformSuffix = ($Platform -replace '^linux/', '') -replace '[^a-zA-Z0-9_-]', '-'
$TarFileName = "$ImageName-$Version-$PlatformSuffix.tar"
$LocalTarPath = Join-Path $ProjectDir $TarFileName
$RemoteTarPath = Join-Path $DestinationDir $TarFileName

$VersionTag = "${ImageName}:${Version}"
$LatestTag = "${ImageName}:latest"

Write-Host "==> Construyendo imagen Docker '$VersionTag' (y '$LatestTag') para plataforma '$Platform'..." -ForegroundColor Cyan

Push-Location $ProjectDir
try {
    docker buildx build `
        --platform $Platform `
        -t $VersionTag `
        -t $LatestTag `
        --load `
        .
    if ($LASTEXITCODE -ne 0) {
        throw "Error al construir la imagen Docker (exit code: $LASTEXITCODE)."
    }

    Write-Host "==> Exportando imagen a '$LocalTarPath'..." -ForegroundColor Cyan
    if (Test-Path $LocalTarPath) {
        Remove-Item -Path $LocalTarPath -Force
    }

    docker save -o $LocalTarPath $VersionTag $LatestTag
    if ($LASTEXITCODE -ne 0) {
        throw "Error al exportar la imagen Docker a tar (exit code: $LASTEXITCODE)."
    }

    $TarSizeMB = [math]::Round((Get-Item $LocalTarPath).Length / 1MB, 2)
    Write-Host "    Archivo generado: $TarFileName ($TarSizeMB MB)" -ForegroundColor Green

    Write-Host "==> Copiando '$TarFileName' a '$DestinationDir'..." -ForegroundColor Cyan
    if (-not (Test-Path $DestinationDir)) {
        New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
    }

    Copy-Item -Path $LocalTarPath -Destination $RemoteTarPath -Force
    Write-Host "✓ Imagen copiada exitosamente a: $RemoteTarPath" -ForegroundColor Green

    if (-not $KeepLocalTar -and (Test-Path $LocalTarPath)) {
        Remove-Item -Path $LocalTarPath -Force
        Write-Host "    Tar temporal local eliminado (usa -KeepLocalTar para conservarlo)." -ForegroundColor DarkGray
    }
}
finally {
    Pop-Location
}
