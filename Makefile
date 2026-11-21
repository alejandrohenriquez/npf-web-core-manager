.PHONY: help version bump-patch bump-minor bump-major set-version build-image docker-image release-patch release-minor release-major build dev

VERSION ?=
BUMP ?=
PLATFORM ?= linux/arm64
DEST ?= \\192.168.31.30\docker\np-factory\images

help:
	@echo "Comandos disponibles en npf-web-core-manager:"
	@echo "  make version                              - Muestra la version SemVer actual"
	@echo "  make bump-patch | bump-minor | bump-major - Incrementa la version SemVer (patch, minor, major)"
	@echo "  make set-version VERSION=x.y.z            - Asigna una version SemVer especifica"
	@echo "  make build-image [BUMP=patch|minor|major] - Construye la imagen Docker (linux/arm64) con la version SemVer y copia el .tar al NAS"
	@echo "  make release-patch | release-minor        - Incrementa version SemVer y publica la imagen en el NAS"
	@echo "  make build                                - Compila TypeScript y el bundle Vite de produccion"
	@echo "  make dev                                  - Inicia el servidor de desarrollo Vite"

version:
	@pwsh -NoProfile -ExecutionPolicy Bypass -File ./script/semver.ps1 -Action show

bump-patch:
	@pwsh -NoProfile -ExecutionPolicy Bypass -File ./script/semver.ps1 -Action bump -Part patch

bump-minor:
	@pwsh -NoProfile -ExecutionPolicy Bypass -File ./script/semver.ps1 -Action bump -Part minor

bump-major:
	@pwsh -NoProfile -ExecutionPolicy Bypass -File ./script/semver.ps1 -Action bump -Part major

set-version:
	@pwsh -NoProfile -ExecutionPolicy Bypass -File ./script/semver.ps1 -Action set -Version "$(VERSION)"

build-image:
	pwsh -NoProfile -ExecutionPolicy Bypass -Command "& ./script/build-image.ps1 -Version '$(VERSION)' -Bump '$(BUMP)' -Platform '$(PLATFORM)' -DestinationDir '$(DEST)'"

docker-image: build-image

release-patch:
	pwsh -NoProfile -ExecutionPolicy Bypass -Command "& ./script/build-image.ps1 -Bump 'patch' -Platform '$(PLATFORM)' -DestinationDir '$(DEST)'"

release-minor:
	pwsh -NoProfile -ExecutionPolicy Bypass -Command "& ./script/build-image.ps1 -Bump 'minor' -Platform '$(PLATFORM)' -DestinationDir '$(DEST)'"

release-major:
	pwsh -NoProfile -ExecutionPolicy Bypass -Command "& ./script/build-image.ps1 -Bump 'major' -Platform '$(PLATFORM)' -DestinationDir '$(DEST)'"

build:
	npm run build

dev:
	npm run dev
