# MultiChat — build local (Windows)
#
# Compila o aplicativo na própria máquina do usuário. Como o arquivo não passa
# por download, ele não recebe a marca de origem (Mark-of-the-Web) e abre sem o
# aviso do SmartScreen de "aplicativo não reconhecido".
#
# Não substitui as releases prontas: compilar localmente baixa cerca de 1,3 GB
# (dependências + binário do Electron) e leva alguns minutos. Use este caminho
# se preferir não liberar manualmente um app baixado.
#
# Uso (PowerShell, na raiz do repositório):
#   .\build-local.ps1              # instala dependências e gera o instalador
#   .\build-local.ps1 -Dir         # só empacota (sem instalador) — mais rápido
#   .\build-local.ps1 -NoInstall   # pula a instalação de dependências
#   .\build-local.ps1 -Help
#
# Se o Windows bloquear a execução do script, rode antes:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

[CmdletBinding()]
param(
	[switch]$Dir,
	[switch]$NoInstall,
	[switch]$Help
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) { Write-Host "==> " -ForegroundColor Cyan -NoNewline; Write-Host $Message }
function Write-Ok([string]$Message)   { Write-Host "  OK  " -ForegroundColor Green -NoNewline; Write-Host $Message }
function Write-Warn2([string]$Message){ Write-Host "  !   " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Die([string]$Message)        { Write-Host "Erro: $Message" -ForegroundColor Red; exit 1 }

if ($Help) {
	Get-Content $PSCommandPath | Select-Object -Skip 1 -First 18 | ForEach-Object { $_ -replace '^#\s?', '' }
	exit 0
}

# ── Pré-requisitos ───────────────────────────────────────────────────────────
Write-Info "Conferindo pré-requisitos"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
	Die "git não encontrado. Instale o git e tente de novo (https://git-scm.com/downloads)."
}
Write-Ok "git $((git --version) -replace 'git version ','')"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
	Die "Node.js não encontrado. Este projeto exige Node.js v24 ou superior (https://nodejs.org/)."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
	Die "npm não encontrado (ele vem junto com o Node.js)."
}

$nodeVersion = (node -p "process.versions.node")
$nodeParts = $nodeVersion.Split(".")
$nodeMajor = [int]$nodeParts[0]
$nodeMinor = [int]$nodeParts[1]
# O mínimo real vem do engines do Electron (>=22.12.0). O CI do projeto usa a
# v24, que é a versão testada — abaixo disso avisamos, mas não bloqueamos.
if ($nodeMajor -lt 22 -or ($nodeMajor -eq 22 -and $nodeMinor -lt 12)) {
	Die "Node.js v$nodeVersion encontrado, mas o mínimo é v22.12. Atualize em https://nodejs.org/."
}
Write-Ok "Node.js v$nodeVersion"
if ($nodeMajor -lt 24) {
	Write-Warn2 "o CI do projeto usa Node.js v24; a v$nodeVersion deve funcionar, mas não é a versão testada"
}

# ── Diretório do projeto ─────────────────────────────────────────────────────
if (-not (Test-Path "package.json")) {
	Die "package.json não encontrado. Execute este script a partir da raiz do repositório clonado:`n`n  git clone https://github.com/maiconfontana/multichat.git`n  cd multichat`n  .\build-local.ps1"
}

$projectName = (node -p "require('./package.json').name")
if ($projectName -ne "multichat") {
	Die "este diretório não parece ser o repositório do MultiChat (package.json name=`"$projectName`")."
}

$version = (node -p "require('./package.json').version")
Write-Ok "projeto: MultiChat $version"
Write-Ok "plataforma: Windows"

# ── Dependências ─────────────────────────────────────────────────────────────
if (-not $NoInstall) {
	Write-Info "Instalando dependências (a primeira execução baixa o Electron, ~850 MB)"
	if (Test-Path "package-lock.json") { npm ci } else { npm install }
	if ($LASTEXITCODE -ne 0) { Die "falha ao instalar as dependências." }
	Write-Ok "dependências instaladas"
} else {
	if (-not (Test-Path "node_modules")) {
		Die "-NoInstall foi usado, mas node_modules não existe. Rode sem essa opção."
	}
	Write-Warn2 "instalação de dependências ignorada (-NoInstall)"
}

# ── Build ────────────────────────────────────────────────────────────────────
if ($Dir) {
	Write-Info "Empacotando sem gerar instalador (-Dir)"
	npm run pack
} else {
	# Limpa saídas antigas: sem isso, o resumo final misturaria artefatos de
	# builds anteriores com os que acabaram de ser gerados.
	Write-Info "Limpando .\dist antes de gerar o pacote"
	npm run clean
	Write-Info "Gerando o instalador (pode levar alguns minutos)"
	npm run dist:windows
}
if ($LASTEXITCODE -ne 0) { Die "o build falhou." }

# ── Resultado ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Info "Build concluído — artefatos em .\dist"

$patterns = @("MultiChat-*-setup.exe", "MultiChat-*-win-*.zip")
$found = @()
foreach ($pattern in $patterns) {
	$found += Get-ChildItem -Path "dist" -Filter $pattern -File -ErrorAction SilentlyContinue
}

if ($found.Count -eq 0) {
	if ($Dir) {
		Write-Warn2 "modo -Dir: nenhum instalador é gerado (apenas dist\win-unpacked)"
		Write-Warn2 "rode sem -Dir para produzir o instalador"
	} else {
		Write-Warn2 "nenhum artefato encontrado em .\dist — confira a saída do build acima"
	}
} else {
	$found | ForEach-Object { Write-Host ("  {0}  ({1:N1} MB)" -f $_.FullName.Replace((Get-Location).Path + "\", ""), ($_.Length / 1MB)) }
}

Write-Host ""
Write-Host "Como instalar:" -ForegroundColor White
foreach ($file in $found) {
	if ($file.Extension -eq ".exe") {
		Write-Host "  $($file.Name): execute e siga o assistente"
	} else {
		Write-Host "  $($file.Name): descompacte e rode MultiChat.exe"
	}
}
Write-Host ""
Write-Host "Como este build foi feito na sua maquina, o arquivo nao carrega a marca"
Write-Host "de origem do download e o SmartScreen nao deve exibir avisos."
Write-Host ""
