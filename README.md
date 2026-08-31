# MultiChat

Cliente desktop **multi-conta** para mensageiros web, construído em [Electron](https://www.electron.dev/).

Use WhatsApp, Microsoft Teams, Telegram, Discord, Slack (ou qualquer URL personalizada) em contas separadas dentro de um único aplicativo, com sidebar, notificações do sistema e contador de mensagens não lidas.

> Projeto derivado de [whatsapp-electron](https://github.com/dagmoller/whatsapp-electron) (fork de [SingleBox](https://github.com/hmami252/whatsapp-desktop-app)).

---

## Funcionalidades

- **Multi-conta**: várias contas do mesmo serviço ou de serviços diferentes, cada uma com seu próprio perfil de navegação (login isolado por conta)
- **Sidebar recolhível**: alterne entre a lista expandida (280px) e o modo compacto apenas com ícones (72px) — o estado é persistido entre inicializações
- **Notificações desktop** com título da conta e clique para focar a conversa; pode ser ligado/desligado por conta
- **Contador de não lidas** por conta, refletido na sidebar e na bandeja (tray)
- **Tray** (bandeja do sistema): minimizar/retornar para a bandeja em vez de fechar
- **Compartilhamento de tela** no WhatsApp Web
- **Correção ortográfica** (en-US, pt-BR)
- **Protocolo `whatsapp://`** registrado como aplicativo associado

## Requisitos

| Item | Versão mínima |
|---|---|
| Node.js | v24 |
| npm | (vem com o Node) |
| git | qualquer recente |

Plataformas testadas: **Linux** e **Windows**.

## Instalação (executar do código-fonte)

```bash
# 1. Clone o repositório
git clone https://github.com/maiconfontana/multichat.git

# 2. Entre no diretório
cd multichat

# 3. Instale as dependências
npm install

# 4. Inicie o app
npm run start
```

### Opções de linha de comando

| Flag | Efeito |
|---|---|
| `--start-in-tray` | Inicia direto na bandeja, sem mostrar a janela |
| `--disable-gpu` | Desabilita aceleração de hardware (útil em terminais/remotos) |
| `--spell-lang=xx-XX` | Idioma adicional da correção ortográfica (ex.: `--spell-lang=es-ES`) |

Exemplo:

```bash
npm run start -- --start-in-tray --disable-gpu
```

## Uso

1. Ao abrir, a primeira conta padrão (WhatsApp) já está carregada.
2. **Adicionar conta**: clique no **＋** no topo da sidebar, escolha o tipo de serviço (WhatsApp, Teams, Telegram, Discord, Slack ou URL personalizada) e dê um nome.
3. **Alternar de conta**: clique no avatar na sidebar.
4. **Recolher/expandir sidebar**: clique no botão de **lista (≡)** no topo da sidebar. No modo recolhido, o contador de não lidas aparece como badge sobre o avatar.
5. **Editar/remover conta**: passe o mouse sobre o item e use os botões de giz e pessoa-com-x. A remoção apaga o login daquela conta.
6. **Notificações**: o botão de sino por conta liga/desliga as notificações do sistema.
7. **Minimizar para a bandeja**: o botão fechar (X) esconde a janela; o ícone na bandeja mostra/oculta.

## Build (distributíveis)

Gera pacotes com [electron-builder](https://www.electron.build):

```bash
npm run pack          # apenas empacota (sem instalador)
npm run dist:linux    # AppImage e tar.xz (Linux x64)
npm run dist:windows  # portable e zip (Windows x64)
npm run dist          # alvo padrão da plataforma atual
```

Os pacotes saem na pasta `dist/`.

> **Release automática**: tags no formato `v*.*.*` disparam o workflow
> [.github/workflows/release.yml](.github/workflows/release.yml), que builda
> Linux e Windows e publica um GitHub Release com os artefatos.

## Estrutura do projeto

```
├── src/
│   ├── main.js               # processo principal (janela, sidebar, contas, tray)
│   ├── constants.js          # nome do app, serviços suportados, eventos IPC
│   ├── preload.js            # ponte IPC da sidebar
│   ├── whatsapp-preload.js   # injeção no WhatsApp Web (não lidas, notificações)
│   ├── messenger-preload.js  # injeção genérica nos demais serviços
│   ├── accounts.html         # UI da sidebar (bootstrap)
│   └── accounts.js           # lógica da sidebar
├── assets/                   # ícones do app
├── scripts/gen-icon.js       # gera assets/icon*.png a partir do SVG
└── package.json              # metadata + config do electron-builder
```

## Licença

[MIT](LICENSE)
