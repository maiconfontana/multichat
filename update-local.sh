#!/usr/bin/env bash
#
# MultiChat — atualização da instalação local (Linux)
#
# Atualiza o MultiChat já instalado nesta máquina: consulta a última release
# publicada, baixa o AppImage, confere o SHA-256 contra o arquivo SHA256SUMS
# da própria release e troca o binário de forma atômica (com backup da versão
# anterior, para poder voltar atrás).
#
# Requer uma instalação feita por este projeto em ~/.local/bin/multichat.
# Se o MultiChat não estiver instalado ali, o script explica como instalar.
#
# Uso:
#   ./update-local.sh              # verifica e atualiza para a última versão
#   ./update-local.sh --check      # só informa se há versão nova
#   ./update-local.sh --yes        # não pede confirmação
#   ./update-local.sh --version 1.6.0
#   ./update-local.sh --rollback   # volta para o backup mais recente
#   ./update-local.sh --help

set -euo pipefail

REPO="maiconfontana/multichat"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
INSTALL_BIN="${HOME}/.local/bin/multichat"
ICON_DIR="${HOME}/.local/share/icons/hicolor"
DESKTOP_FILE="${HOME}/.local/share/applications/multichat.desktop"
BACKUP_DIR="${HOME}/.local/share/multichat/backups"
DOWNLOAD_DIR=""

# ── Saída ────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
	BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
	BOLD=""; GREEN=""; YELLOW=""; RED=""; RESET=""
fi

info() { printf '%s\n' "${BOLD}==>${RESET} $*"; }
ok()   { printf '%s\n' "${GREEN}  ✓${RESET} $*"; }
warn() { printf '%s\n' "${YELLOW}  !${RESET} $*"; }
die()  { printf '%s\n' "${RED}Erro:${RESET} $*" >&2; exit 1; }

cleanup() {
	[ -n "$DOWNLOAD_DIR" ] && [ -d "$DOWNLOAD_DIR" ] && rm -rf "$DOWNLOAD_DIR"
	# Precisa terminar com sucesso: o status do trap de EXIT substitui o do
	# script, e um `exit 10` em --check viraria 1.
	return 0
}
trap cleanup EXIT

need() {
	command -v "$1" >/dev/null 2>&1 || die "\"$1\" não encontrado. Instale-o e tente de novo."
}

# ── Argumentos ───────────────────────────────────────────────────────────────
CHECK_ONLY=0
ASSUME_YES=0
TARGET_VERSION=""
DO_ROLLBACK=0

while [ $# -gt 0 ]; do
	case "$1" in
		--check)    CHECK_ONLY=1 ;;
		--yes|-y)   ASSUME_YES=1 ;;
		--rollback) DO_ROLLBACK=1 ;;
		--version)
			[ $# -ge 2 ] || die "--version exige um número (ex.: --version 1.6.0)"
			TARGET_VERSION="${2#v}"
			shift
			;;
		-h|--help)
			cat <<-'EOF'

				MultiChat — atualização da instalação local (Linux)

				Consulta a última release, baixa o AppImage, confere o SHA-256 e troca
				o binário instalado, guardando backup da versão anterior.

				Uso:
				  ./update-local.sh              verifica e atualiza
				  ./update-local.sh --check      só informa se há versão nova
				  ./update-local.sh --yes        não pede confirmação
				  ./update-local.sh --version 1.6.0
				  ./update-local.sh --rollback   volta para o backup mais recente
				  ./update-local.sh --help

				Instalação esperada: ~/.local/bin/multichat (AppImage)
			EOF
			exit 0
			;;
		*) die "argumento desconhecido: $1 (use --help)" ;;
	esac
	shift
done

# ── Rollback ─────────────────────────────────────────────────────────────────
if [ "$DO_ROLLBACK" -eq 1 ]; then
	[ -d "$BACKUP_DIR" ] || die "nenhum backup encontrado em $BACKUP_DIR"

	LATEST_BACKUP="$(find "$BACKUP_DIR" -maxdepth 1 -name 'multichat-*' -type f | sort | tail -1)"
	[ -n "$LATEST_BACKUP" ] || die "nenhum backup encontrado em $BACKUP_DIR"

	BACKUP_VERSION="$(basename "$LATEST_BACKUP" | sed 's/^multichat-//')"
	info "Restaurando a versão ${BOLD}${BACKUP_VERSION}${RESET} (backup: $LATEST_BACKUP)"

	if [ "$ASSUME_YES" -eq 0 ] && [ -t 0 ]; then
		printf 'Confirma? [s/N] '
		read -r ANSWER
		case "$ANSWER" in [sS]) ;; *) echo "Cancelado."; exit 0 ;; esac
	fi

	cp -f "$INSTALL_BIN" "${BACKUP_DIR}/multichat-$(date +%Y%m%d%H%M%S).bak" 2>/dev/null || true
	install -m 755 "$LATEST_BACKUP" "$INSTALL_BIN"
	ok "restaurado: $INSTALL_BIN"
	exit 0
fi

# ── Pré-requisitos ───────────────────────────────────────────────────────────
need curl
need sha256sum

# ── Estado atual ─────────────────────────────────────────────────────────────
[ -f "$INSTALL_BIN" ] || die "MultiChat não encontrado em ${INSTALL_BIN}.

Para instalar, use o pacote pronto:
  https://maiconfontana.github.io/multichat/
ou compile localmente a partir da raiz do repositório:
  ./build-local.sh"

# O AppImage (tipo 2, squashfs) carrega o .desktop que o electron-builder
# gerou, com a versão em X-AppImage-Version. Extrai só esse arquivo, em um
# diretório temporário, sem executar o aplicativo.
detect_installed_version() {
	local tmp desktop
	tmp="$(mktemp -d)" || return 1

	# --appimage-extract escreve em ./squashfs-root relativo ao diretório atual.
	if ! ( cd "$tmp" && "$INSTALL_BIN" --appimage-extract '*.desktop' >/dev/null 2>&1 ); then
		rm -rf "$tmp"
		return 1
	fi

	desktop="$(find "$tmp" -name '*.desktop' -type f | head -1)"
	if [ -z "$desktop" ]; then
		rm -rf "$tmp"
		return 1
	fi

	sed -n 's/^X-AppImage-Version=//p' "$desktop" | head -1
	rm -rf "$tmp"
}

CURRENT_VERSION="$(detect_installed_version || true)"
[ -n "$CURRENT_VERSION" ] || CURRENT_VERSION="desconhecida"

info "Versão instalada: ${BOLD}${CURRENT_VERSION}${RESET}"

# ── Consulta da release ──────────────────────────────────────────────────────
info "Consultando a última release do GitHub"

if [ -n "$TARGET_VERSION" ]; then
	RELEASE_JSON="$(curl -fsSL -H 'Accept: application/vnd.github+json' \
		"https://api.github.com/repos/${REPO}/releases/tags/v${TARGET_VERSION}")" \
		|| die "release v${TARGET_VERSION} não encontrada."
	LATEST_VERSION="$TARGET_VERSION"
else
	RELEASE_JSON="$(curl -fsSL -H 'Accept: application/vnd.github+json' "$API_URL")" \
		|| die "não foi possível consultar a API do GitHub (sem internet ou limite de requisições)."
	TAG="$(printf '%s' "$RELEASE_JSON" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1)"
	[ -n "$TAG" ] || die "não foi possível interpretar a resposta do GitHub."
	LATEST_VERSION="${TAG#v}"
fi

# Percorre as URLs de download da release e escolhe o AppImage da versão.
ASSET_URL="$(printf '%s' "$RELEASE_JSON" \
	| grep -o '"browser_download_url": *"[^"]*"' \
	| grep -F "MultiChat-${LATEST_VERSION}.AppImage" \
	| sed 's/.*"\(https\?:\/\/[^"]*\)".*/\1/' \
	| head -1)"

[ -n "$ASSET_URL" ] || die "o AppImage da versão ${LATEST_VERSION} não foi encontrado na release."

ok "última versão publicada: ${BOLD}${LATEST_VERSION}${RESET}"

# ── Comparação ───────────────────────────────────────────────────────────────
# Compara números, não texto: 1.10.0 é mais novo que 1.9.0.
is_newer() {
	[ "$1" = "$2" ] && return 1
	[ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -1)" = "$1" ]
}

if [ "$CHECK_ONLY" -eq 1 ]; then
	if is_newer "$LATEST_VERSION" "$CURRENT_VERSION"; then
		printf '\n%s\n' "${YELLOW}Há versão nova disponível: ${CURRENT_VERSION} → ${LATEST_VERSION}${RESET}"
		printf '%s\n' "Rode ./update-local.sh para atualizar."
		exit 10
	else
		printf '\n%s\n' "${GREEN}Você já está na versão mais recente (${CURRENT_VERSION}).${RESET}"
		exit 0
	fi
fi

if ! is_newer "$LATEST_VERSION" "$CURRENT_VERSION"; then
	printf '\n%s\n' "${GREEN}Você já está na versão mais recente (${CURRENT_VERSION}).${RESET}"
	exit 0
fi

# ── Confirmação ──────────────────────────────────────────────────────────────
printf '\n%s\n' "Atualizar ${BOLD}${CURRENT_VERSION}${RESET} → ${BOLD}${LATEST_VERSION}${RESET}"
printf '%s\n' "  Binário: $INSTALL_BIN"

if pgrep -f "$INSTALL_BIN" >/dev/null 2>&1; then
	warn "o MultiChat parece estar em execução — feche-o antes de continuar"
fi

if [ "$ASSUME_YES" -eq 0 ] && [ -t 0 ]; then
	printf 'Confirma? [s/N] '
	read -r ANSWER
	case "$ANSWER" in [s|S]) ;; *) echo "Cancelado."; exit 0 ;; esac
fi

# ── Download e verificação ───────────────────────────────────────────────────
DOWNLOAD_DIR="$(mktemp -d)"
APPIMAGE_PATH="${DOWNLOAD_DIR}/MultiChat-${LATEST_VERSION}.AppImage"

info "Baixando o AppImage ${LATEST_VERSION}"
curl -fL --progress-bar -o "$APPIMAGE_PATH" "$ASSET_URL" \
	|| die "falha no download do AppImage."
ok "download concluído ($(du -h "$APPIMAGE_PATH" | cut -f1))"

info "Conferindo a integridade (SHA-256)"
SUMS_URL="https://github.com/${REPO}/releases/download/v${LATEST_VERSION}/SHA256SUMS.txt"
if curl -fsSL -o "${DOWNLOAD_DIR}/SHA256SUMS.txt" "$SUMS_URL" 2>/dev/null; then
	EXPECTED="$(grep "MultiChat-${LATEST_VERSION}.AppImage\$" "${DOWNLOAD_DIR}/SHA256SUMS.txt" | awk '{print $1}' | head -1)"

	if [ -n "$EXPECTED" ]; then
		ACTUAL="$(sha256sum "$APPIMAGE_PATH" | awk '{print $1}')"
		if [ "$EXPECTED" != "$ACTUAL" ]; then
			die "o SHA-256 não confere — download corrompido ou adulterado.
  esperado: $EXPECTED
  obtido:   $ACTUAL"
		fi
		ok "SHA-256 confere com o publicado na release"
	else
		warn "o AppImage não consta em SHA256SUMS.txt desta release; verificação ignorada"
	fi
else
	warn "SHA256SUMS.txt indisponível nesta release; verificação ignorada"
fi

# ── Instalação (atômica, com backup) ─────────────────────────────────────────
info "Instalando"
mkdir -p "$BACKUP_DIR" "$(dirname "$INSTALL_BIN")"

if [ -f "$INSTALL_BIN" ]; then
	BACKUP_PATH="${BACKUP_DIR}/multichat-${CURRENT_VERSION}"
	cp -f "$INSTALL_BIN" "$BACKUP_PATH"
	ok "backup da versão anterior: $BACKUP_PATH"
fi

# Escreve em um temporário no mesmo diretório e move por cima: o move é atômico,
# então não existe estado intermediário com o binário truncado.
STAGED="${INSTALL_BIN}.new"
install -m 755 "$APPIMAGE_PATH" "$STAGED"
mv -f "$STAGED" "$INSTALL_BIN"
ok "binário atualizado: $INSTALL_BIN"

# ── Ícones (best-effort) ─────────────────────────────────────────────────────
# Usa os ícones do repositório quando o script roda a partir dele; senão,
# extrai do próprio AppImage baixado. Falha aqui não compromete a atualização.
ICON_SOURCE=""
for CANDIDATE in "assets" "$(dirname "$0")/assets"; do
	if [ -f "${CANDIDATE}/icon-256.png" ]; then ICON_SOURCE="$CANDIDATE"; break; fi
done

if [ -z "$ICON_SOURCE" ] && [ -d "$ICON_DIR" ]; then
	EXTRACT_ICONS="$(mktemp -d)"
	if ( cd "$EXTRACT_ICONS" && "$APPIMAGE_PATH" --appimage-extract 'usr/share/icons/*' >/dev/null 2>&1 ); then
		ICON_SOURCE="${EXTRACT_ICONS}/squashfs-root/usr/share/icons/hicolor"
	fi
fi

if [ -n "$ICON_SOURCE" ] && [ -d "$ICON_DIR" ]; then
	ICON_OK=0
	for SIZE in 32 128 256 512; do
		DEST="${ICON_DIR}/${SIZE}x${SIZE}/apps/multichat.png"
		[ -d "$(dirname "$DEST")" ] || continue
		SRC="${ICON_SOURCE}/icon-${SIZE}.png"
		[ -f "$SRC" ] || SRC="${ICON_SOURCE}/${SIZE}x${SIZE}/apps/multichat.png"
		[ -f "$SRC" ] || continue
		cp -f "$SRC" "$DEST" 2>/dev/null && ICON_OK=1
	done
	[ "$ICON_OK" -eq 1 ] && ok "ícones atualizados" || true
fi

if [ -f "$DESKTOP_FILE" ]; then
	if command -v update-desktop-database >/dev/null 2>&1; then
		update-desktop-database "${HOME}/.local/share/applications" 2>/dev/null || true
	fi
	command -v gtk-update-icon-cache >/dev/null 2>&1 && \
		gtk-update-icon-cache -f -t "$ICON_DIR" >/dev/null 2>&1 || true
fi

# ── Resultado ────────────────────────────────────────────────────────────────
printf '\n'
printf '%s\n' "${GREEN}${BOLD}MultiChat atualizado: ${CURRENT_VERSION} → ${LATEST_VERSION}${RESET}"
printf '%s\n' "Abra pelo menu do sistema ou rode: ${BOLD}multichat${RESET}"
[ -d "$BACKUP_DIR" ] && printf '%s\n' "Para voltar atrás: ./update-local.sh --rollback"
printf '\n'
