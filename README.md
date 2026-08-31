# MultiChat

Cliente desktop **multi-conta** para mensageiros web, construído em [Electron](https://www.electron.dev/).

Use WhatsApp, Microsoft Teams, Telegram, Discord, Slack (ou qualquer URL personalizada) em contas separadas dentro de um único aplicativo, com sidebar, notificações do sistema e contador de mensagens não lidas.

> Projeto derivado de [whatsapp-electron](https://github.com/dagmoller/whatsapp-electron) (fork de [SingleBox](https://github.com/hmami252/whatsapp-desktop-app)).

---

## Funcionalidades

- **Multi-conta**: várias contas do mesmo serviço ou de serviços diferentes, cada uma com seu próprio perfil de navegação (login isolado por conta)
- **Leve por design**: apenas a conta em uso fica carregada — as demais são criadas sob demanda (lazy-load) e suspensas automaticamente após 10 minutos sem uso, devolvendo a memória ao sistema sem perder o login
- **Sidebar recolhível**: alterne entre a lista expandida (280px) e o modo compacto apenas com ícones (72px) — o estado é persistido entre inicializações
- **Notificações desktop** com título da conta e clique para focar a conversa; pode ser ligado/desligado por conta
- **Contador de não lidas** por conta, refletido na sidebar e na bandeja (tray)
- **Tray** (bandeja do sistema): minimizar/retornar para a bandeja em vez de fechar
- **Compartilhamento de tela** no WhatsApp Web, com seletor próprio de telas/janelas
- **Correção ortográfica** (en-US, pt-BR)
- **Protocolo `whatsapp://`** registrado como aplicativo associado
- **Funciona offline na interface**: os recursos da interface (Bootstrap e ícones) são carregados localmente, sem CDN

## Requisitos

| Item | Versão mínima |
|---|---|
| Node.js | v24 |
| npm | (vem com o Node) |
| git | qualquer recente |

Plataformas suportadas: **Linux**, **Windows** e **macOS** (Intel e Apple Silicon).

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
2. **Adicionar conta**: clique no **＋** no topo da sidebar, escolha o tipo de serviço (WhatsApp, Teams, Telegram, Discord, Slack ou URL personalizada) e dê um nome. A sidebar expande sozinha se estiver recolhida.
3. **Alternar de conta**: clique no avatar na sidebar (ou `Ctrl+Tab` / `Ctrl+Shift+Tab`). A conta é carregada na primeira vez que for aberta.
4. **Recolher/expandir sidebar**: clique no botão de **painel** no topo da sidebar. No modo recolhido, o contador de não lidas aparece como badge sobre o avatar.
5. **Editar/remover conta**: passe o mouse sobre o item e use os botões de lápis e pessoa-com-x. A remoção apaga o login daquela conta.
6. **Notificações**: o botão de sino por conta liga/desliga as notificações do sistema.
7. **Minimizar para a bandeja**: o botão fechar (X) esconde a janela; o ícone na bandeja mostra/oculta.

## Build (distributíveis)

Gera pacotes com [electron-builder](https://www.electron.build):

```bash
npm run pack          # apenas empacota (sem instalador)
npm run dist:linux    # AppImage e tar.xz (Linux x64)
npm run dist:windows  # instalador NSIS + zip (Windows x64)
npm run dist:mac      # dmg + zip (macOS Intel e Apple Silicon)
npm run dist          # alvo padrão da plataforma atual
npm run icons         # regenera os ícones (inclui icon.ico p/ Windows)
```

Os pacotes saem na pasta `dist/`.

> **Release automática**: tags no formato `v*.*.*` disparam o workflow
> [.github/workflows/release.yml](.github/workflows/release.yml), que builda
> Linux, Windows e macOS e publica um GitHub Release com os artefatos.

## Estrutura do projeto

```
├── src/
│   ├── main.js               # processo principal (janela, sidebar, contas, tray, lazy-load)
│   ├── constants.js          # nome do app, serviços suportados, eventos IPC
│   ├── preload.js            # ponte IPC da sidebar
│   ├── whatsapp-preload.js   # injeção no WhatsApp Web (não lidas, notificações)
│   ├── messenger-preload.js  # injeção genérica nos demais serviços
│   ├── accounts.html         # UI da sidebar (bootstrap)
│   ├── accounts.js           # lógica da sidebar
│   ├── screenshare.html      # seletor de compartilhamento de tela (janela própria)
│   ├── screenshare-preload.js# ponte IPC do seletor
│   └── vendor/               # bootstrap + ícones servidos localmente (sem CDN)
├── assets/                   # ícones do app (png + ico)
├── scripts/gen-icon.js       # gera derivados do ícone a partir do PNG mestre
└── package.json              # metadata + config do electron-builder
```

## Licença

[MIT](LICENSE)
