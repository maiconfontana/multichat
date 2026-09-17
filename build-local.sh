#!/usr/bin/env bash
#
# MultiChat — build local (Linux e macOS)
#
# Compila o aplicativo na própria máquina do usuário, gerando o pacote da
# plataforma atual. Como o arquivo não passa por download, ele não recebe a
# marca de origem (quarentena do macOS / Mark-of-the-Web do Windows) e abre
# sem os avisos de "app não verificado".
#
# Não substitui as releases prontas: compilar localmente baixa cerca de 1,3 GB
# (dependências + binário do Electron) e leva alguns minutos. Use este caminho
# se preferir não liberar manualmente um app baixado.
#
# Uso:
#   ./build-local.sh              # instala deps e gera o instalador da plataforma
#   ./build-local.sh --dir        # só empacota (sem instalador) — mais rápido
#   ./build-local.sh --no-install # pula a instalação de dependências
#   ./build-local.sh --help

set -euo pipefail

# ── Saída ────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
	BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
	BOLD=""; GREEN=""; YELLOW=""; RED=""; RESET=""
fi

info()  { printf '%s\n' "${BOLD}==>${RESET} $*"; }
ok()    { printf '%s\n' "${GREEN}  ✓${RESET} $*"; }
warn()  { printf '%s\n' "${YELLOW}  !${RESET} $*"; }
die()   { printf '%s\n' "${RED}Erro:${RESET} $*" >&2; exit 1; }

# ── Argumentos ───────────────────────────────────────────────────────────────
MODE="installer"
DO_INSTALL=1

while [ $# -gt 0 ]; do
	case "$1" in
		--dir|--pack)  MODE="dir" ;;
		--no-install)  DO_INSTALL=0 ;;
		-h|--help)
			cat <<-'EOF'

				MultiChat — build local (Linux e macOS)

				Compila o aplicativo na própria máquina, gerando o pacote da plataforma
				atual. Como o arquivo não passa por download, ele não recebe a marca de
				origem (quarentena do macOS) e abre sem os avisos de "app não verificado".

				Uso:
				  ./build-local.sh              instala dependências e gera o instalador
				  ./build-local.sh --dir        só empacota (sem instalador) — mais rápido
				  ./build-local.sh --no-install pula a instalação de dependências
				  ./build-local.sh --help       mostra esta ajuda

				Observação: a primeira execução baixa o binário do Electron (~850 MB).
				Prefere não compilar? Baixe o pacote pronto em
				https://maiconfontana.github.io/multichat/
			EOF
			exit 0
			;;
		*) die "argumento desconhecido: $1 (use --help)" ;;
	esac
	shift
done

# ── Pré-requisitos ───────────────────────────────────────────────────────────
info "Conferindo pré-requisitos"

command -v git >/dev/null 2>&1 || die "git não encontrado. Instale o git e tente de novo (https://git-scm.com/downloads)."
ok "git $(git --version | awk '{print $3}')"

command -v node >/dev/null 2>&1 || die "Node.js não encontrado. Este projeto exige Node.js v24 ou superior (https://nodejs.org/)."

command -v npm >/dev/null 2>&1 || die "npm não encontrado (ele vem junto com o Node.js)."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]' 2>/dev/null || echo 0)"
# O mínimo real vem do engines do Electron (>=22.12.0). O CI do projeto usa a
# v24, que é a versão testada — abaixo disso avisamos, mas não bloqueamos.
if [ "$NODE_MAJOR" -lt 22 ] || { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 12 ]; }; then
	die "Node.js v$(node -v | sed 's/^v//') encontrado, mas o mínimo é v22.12. Atualize em https://nodejs.org/."
fi
ok "Node.js $(node -v) / npm $(npm -v)"
if [ "$NODE_MAJOR" -lt 24 ]; then
	warn "o CI do projeto usa Node.js v24; a v$(node -v | sed 's/^v//') deve funcionar, mas não é a versão testada"
fi

# ── Diretório do projeto ─────────────────────────────────────────────────────
# O script roda a partir da raiz do repositório; confere pela presença do
# package.json com o nome esperado, para não compilar o projeto errado.
[ -f package.json ] || die "package.json não encontrado. Execute este script a partir da raiz do repositório clonado:

  git clone https://github.com/maiconfontana/multichat.git
  cd multichat
  ./build-local.sh"

PROJECT_NAME="$(node -p 'require("./package.json").name' 2>/dev/null || echo "")"
[ "$PROJECT_NAME" = "multichat" ] || die "este diretório não parece ser o repositório do MultiChat (package.json name=\"$PROJECT_NAME\")."

VERSION="$(node -p 'require("./package.json").version')"
ok "projeto: MultiChat $VERSION"

# ── Plataforma ───────────────────────────────────────────────────────────────
case "$(uname -s)" in
	Darwin) PLATFORM="mac";   LABEL="macOS" ;;
	Linux)  PLATFORM="linux"; LABEL="Linux" ;;
	*) die "sistema não suportado por este script: $(uname -s). No Windows, use o build-local.ps1." ;;
esac
ok "plataforma: $LABEL"

# ── Dependências ─────────────────────────────────────────────────────────────
if [ "$DO_INSTALL" -eq 1 ]; then
	info "Instalando dependências (a primeira execução baixa o Electron, ~850 MB)"
	if [ -f package-lock.json ]; then
		npm ci
	else
		npm install
	fi
	ok "dependências instaladas"
else
	[ -d node_modules ] || die "--no-install foi usado, mas node_modules não existe. Rode sem essa opção."
	warn "instalação de dependências ignorada (--no-install)"
fi

# ── Build ────────────────────────────────────────────────────────────────────
if [ "$MODE" = "dir" ]; then
	info "Empacotando sem gerar instalador (--dir)"
	npm run pack
else
	# Limpa saídas antigas: sem isso, o resumo final misturaria artefatos de
	# builds anteriores com os que acabaram de ser gerados.
	info "Limpando ./dist antes de gerar o pacote"
	npm run clean

	info "Gerando o instalador para $LABEL (pode levar alguns minutos)"
	case "$PLATFORM" in
		mac)   npm run dist:mac ;;
		linux) npm run dist:linux ;;
	esac
fi

# ── Resultado ────────────────────────────────────────────────────────────────
# Mostra só o que ESTE build gerou: artefatos antigos podem estar em ./dist e
# confundir a leitura. Usa o arquivo mais recente por tipo.
printf '\n'
info "Build concluído — artefatos em ./dist"

newest() {
	# $1 = padrão glob; devolve o arquivo mais recente que casa, ou vazio.
	find dist -maxdepth 1 -name "$1" -type f -printf '%T@ %p\n' 2>/dev/null \
		| sort -rn | head -1 | cut -d' ' -f2-
}

FOUND_ANY=0
for PATTERN in 'MultiChat-*.AppImage' 'MultiChat-*.tar.xz' 'MultiChat-*.dmg' 'MultiChat-*-setup.exe' 'MultiChat-*-win-*.zip'; do
	FOUND="$(newest "$PATTERN")"
	[ -n "$FOUND" ] || continue
	FOUND_ANY=1
	printf '  %s  (%s)\n' "$FOUND" "$(du -h "$FOUND" | cut -f1)"
done

if [ "$FOUND_ANY" -eq 0 ]; then
	if [ "$MODE" = "dir" ]; then
		warn "modo --dir: nenhum instalador é gerado (apenas dist/*-unpacked)"
		warn "rode sem --dir para produzir o pacote da plataforma"
	else
		warn "nenhum artefato encontrado em ./dist — confira a saída do build acima"
	fi
fi

printf '\n'
case "$PLATFORM" in
	linux)
		APPIMAGE="$(newest 'MultiChat-*.AppImage')"
		if [ -n "$APPIMAGE" ]; then
			cat <<-EOF
				${BOLD}Como executar:${RESET}
				  chmod +x $APPIMAGE
				  ./$APPIMAGE
			EOF
		fi
		;;
	mac)
		DMG="$(newest 'MultiChat-*.dmg')"
		if [ -n "$DMG" ]; then
			cat <<-EOF
				${BOLD}Como instalar:${RESET}
				  abra $DMG e arraste o MultiChat para Aplicativos
			EOF
		fi
		cat <<-EOF

			Como este build foi feito na sua máquina, o app não está em
			quarentena e deve abrir sem o aviso de "desenvolvedor não verificado".
			Se ainda aparecer algum aviso, libere em
			Ajustes do Sistema → Privacidade e Segurança.
		EOF
		;;
esac
printf '\n'
