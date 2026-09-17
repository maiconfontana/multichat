# Guia de Contribuição

Obrigado pelo interesse em contribuir com o **MultiChat**! Este documento descreve como
propor mudanças, o padrão de commits e o que esperamos de um pull request.

Ao participar, você concorda em seguir o nosso [Código de Conduta](CODE_OF_CONDUCT.md).
Para relatos de vulnerabilidade, siga a [Política de Segurança](SECURITY.md) — **não abra issue pública**.

---

## Formas de contribuir

Você não precisa escrever código para ajudar:

| Forma | Como |
|---|---|
| Reportar bug | [Abra uma issue](https://github.com/maiconfontana/multichat/issues/new?template=bug_report.yml) com passos para reproduzir |
| Sugerir recurso | [Abra uma issue](https://github.com/maiconfontana/multichat/issues/new?template=feature_request.yml) descrevendo o problema antes da solução |
| Melhorar a documentação | Pull request direto no `README.md` ou nos arquivos `.github/` |
| Traduzir | Abra uma issue propondo o idioma antes de traduzir o README inteiro |
| Enviar código | Siga o fluxo abaixo |

Antes de começar algo grande, **abra uma issue para alinhar o escopo**. Isso evita
trabalho que não vai ser aceito — e nós avisamos rápido quando a ideia não encaixa no projeto.

## Configuração do ambiente

**Requisitos:** Node.js v24 ou superior, npm e git.

```bash
# 1. Faça um fork pelo botão "Fork" no GitHub e clone o SEU fork
git clone https://github.com/<seu-usuario>/multichat.git
cd multichat

# 2. Adicione o repositório original como upstream
git remote add upstream https://github.com/maiconfontana/multichat.git

# 3. Instale as dependências
npm install

# 4. Confirme que o ambiente está saudável
npm test      # testes unitários — devem passar todos
npm run check # validação de sintaxe dos processos principal e preloads
```

> **Ambiente headless (servidor, CI, container sem display):** o app Electron não abre.
> Os testes unitários cobrem a lógica pura (adaptadores com DOM fake, política de recursos)
> e funcionam normalmente. Para testar a interface, use uma máquina com ambiente gráfico.

### Iniciando o app

```bash
npm run start
# ou, em ambiente sem aceleração de hardware:
npm run start -- --disable-gpu
```

## Fluxo de trabalho

1. **Sincronize** antes de começar:

   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Crie uma branch** com nome descritivo, usando o padrão `tipo/assunto-curto`:

   ```bash
   git checkout -b fix/cola-ctrl-v-macos
   git checkout -b feat/notificacoes-por-conta
   git checkout -b docs/guia-contribuicao
   ```

3. **Faça commits pequenos e focados.** Um commit, uma mudança lógica.

4. **Verifique localmente antes de enviar** (o CI vai rodar exatamente isto):

   ```bash
   npm run check
   npm test
   ```

5. **Envie para o seu fork e abra o pull request** contra a branch `main`:

   ```bash
   git push origin fix/cola-ctrl-v-macos
   ```

## Padrão de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/). O histórico do
projeto já segue esse padrão.

```
tipo: descrição curta no imperativo
```

| Tipo | Uso |
|---|---|
| `feat` | Novo recurso para o usuário |
| `fix` | Correção de bug |
| `docs` | Somente documentação |
| `refactor` | Mudança de código que não corrige bug nem adiciona recurso |
| `perf` | Melhoria de desempenho |
| `test` | Adição ou correção de testes |
| `build` | Build, empacotamento, dependências |
| `ci` | Configuração de integração contínua |
| `chore` | Manutenção que não se encaixa acima |

Exemplos reais do histórico:

```
fix: recria variável 'instance' acidentalmente removida em setCurrentView
feat: assistente contextual para WhatsApp e política de suspensão configurável
docs: atualiza README completo, CI de release e funding
```

Regras:

- Descrição no **imperativo** e em **minúsculas**: "corrige", não "corrigido" nem "Corrigindo";
- Sem ponto final;
- Use o corpo do commit para explicar **por que** a mudança existe, quando não for óbvio;
- Referencie a issue: `fix: ... (#12)` ou `Closes #12` no corpo.

## O que esperamos de um pull request

- [ ] A mudança resolve **um** problema e está descrita no PR (o template guia o preenchimento);
- [ ] `npm run check` e `npm test` passam localmente;
- [ ] Código novo relevante vem acompanhado de teste em `test/` (`node --test`, sem framework novo);
- [ ] Nenhum segredo, chave de API, `.env` ou dado pessoal no diff;
- [ ] O `README.md` foi atualizado se a mudança afeta uso, flags ou estrutura de arquivos;
- [ ] A mudança roda em Linux, Windows e macOS, ou o PR diz explicitamente onde não foi testada.

PRs pequenos são revisados muito mais rápido. Se a mudança é grande, prefira quebrá-la
em pull requests encadeados.

### Escopo do projeto

O MultiChat é um wrapper de mensageiros web em Electron. Contribuições que seguem a
arquitetura existente (processo principal em `src/main.js`, pontes IPC via preload com
`contextIsolation` e `sandbox` ativos, interface servida localmente sem CDN) têm prioridade.

**Não são aceitas:**

- Mudanças que desliguem o isolamento de contexto (`contextIsolation`, `sandbox`, `nodeIntegration`);
- Carregamento de recursos de interface via CDN;
- Telemetria ou coleta de dados sem consentimento explícito e documentado;
- Envio automático de mensagens sem revisão do usuário;
- Dependências novas sem justificativa no PR — o projeto mantém a superfície mínima.

### Segurança em primeiro lugar

- A chave de API do assistente é armazenada com `safeStorage` do Electron. Nunca
  introduza caminhos que gravem chaves em texto puro, em log ou em arquivo de configuração simples;
- Todo novo canal de IPC precisa validar a origem e os dados no processo principal;
- Se a sua contribuição **corrige** uma vulnerabilidade, siga a [Política de Segurança](SECURITY.md)
  em vez de abrir um PR público descrevendo a falha.

## Testes

Não usamos framework de teste: os testes rodam com o runner nativo do Node (`node --test`).

```bash
npm test                        # todos os testes
node --test test/assistant-core.test.js   # um arquivo
node --test --watch             # modo observador
```

Um teste em `test/` deve ser isolado — sem depender de display, rede externa ou do app
Electron em execução. Para lógica que toca o DOM de páginas web, use o padrão dos testes
existentes (`whatsapp-assistant-adapter.test.js` monta um DOM falso).

## Build de distributíveis

Releases são gerados automaticamente por tag `v*.*.*` (veja
[`.github/workflows/release.yml`](.github/workflows/release.yml)). Para testar localmente:

```bash
npm run pack          # apenas empacota
npm run dist:linux    # AppImage + tar.xz
npm run dist:windows  # instalador NSIS + zip
npm run dist:mac      # dmg + zip (Intel e Apple Silicon)
```

## Atribuição e licença

O MultiChat é distribuído sob a [licença MIT](LICENSE) e é derivado de
[whatsapp-electron](https://github.com/dagmoller/whatsapp-electron) (fork de
[SingleBox](https://github.com/hmami252/whatsapp-desktop-app)). Ao contribuir, você concorda
que a sua contribuição seja licenciada sob os mesmos termos.

Não remova os créditos de autoria dos projetos originais.

## Dúvidas

Se algo neste guia não ficou claro, abra uma issue com a label `question` — a resposta
provavelmente ajuda a próxima pessoa também.
