# Política de Segurança

## Versões suportadas

Correções de segurança são aplicadas na versão mais recente publicada e na `main`.
Versões anteriores não recebem correções retroativas.

| Versão | Suporte |
|---|---|
| 1.5.x (mais recente) | ✅ |
| `main` (desenvolvimento) | ✅ |
| anteriores | ❌ |

## Como relatar uma vulnerabilidade

**Não abra uma issue pública.** Vulnerabilidades devem ser relatadas em canal privado:

1. Acesse a aba [**Security**](https://github.com/maiconfontana/multichat/security) do repositório.
2. Clique em **Report a vulnerability** (Private Vulnerability Reporting).
3. Descreva o problema e envie — o relato é visível apenas para os mantenedores.

O canal privado do GitHub é a única via oficial. Se você não conseguir usá-lo,
abra uma issue **sem detalhes técnicos**, apenas pedindo um canal alternativo de contato.

### O que incluir no relato

- Versão do MultiChat e sistema operacional (e arquitetura, ex.: Linux x64, macOS arm64);
- Descrição do problema e o impacto que ele permite;
- Passos para reproduzir (comandos, capturas ou prova de conceito mínima);
- Se a falha depende de configuração específica (gateway do assistente, chave de API, conta suspensa etc.);
- Se possível, uma sugestão de correção.

### O que NÃO incluir

Não envie chaves de API reais, `.env`, tokens, dados de conversas ou qualquer
credencial de terceiros. Se uma chave sua aparecer no relato, **revogue-a antes de enviar**:
o envio de segredos reais por qualquer canal é considerado um incidente do lado de quem envia.

## Escopo

**Dentro do escopo:**

- Processo principal e preloads do Electron (`src/main.js`, `src/*-preload.js`);
- Isolamento entre contas e entre janelas (`contextIsolation`, `sandbox`, `nodeIntegration`);
- Validação de IPC entre renderer e processo principal;
- Injeção de conteúdo nos serviços web (WhatsApp, Teams, Telegram, Discord, Slack);
- Armazenamento local de configurações e da chave de API do assistente (`safeStorage`);
- Fluxo de build, empacotamento e publicação de releases.

**Fora do escopo:**

- Vulnerabilidades nos sites de terceiros (WhatsApp Web, Teams etc.) — relate aos respectivos fornecedores;
- Uso de automação não oficial de mensageiros contra os termos de serviço das plataformas;
- Engenharia social, spam, phishing ou abuso pelo usuário do app;
- Ataques que exigem acesso físico desbloqueado à máquina ou um sistema já comprometido;
- Vulnerabilidades em dependências de terceiros: mesmo escopo acima, **exceto** quando o MultiChat
  as torna exploráveis de forma nova — nesse caso, o relato é bem-vindo.

## Prazo de resposta

| Etapa | Prazo-alvo |
|---|---|
| Confirmação de recebimento | até 5 dias úteis |
| Avaliação inicial e classificação | até 10 dias úteis |
| Correção ou plano de correção | depende da gravidade; comunicado no relato |

O projeto é mantido por voluntários, sem SLA contratual. Os prazos acima são um alvo de boa-fé.

## Divulgação responsável

Pedimos que você aguarde a publicação de uma correção antes de tornar o problema público.
Crédito pelo relato é dado no GitHub Security Advisory quando você assim desejar.
Avisos de segurança são publicados na aba **Security → Advisories** e nas notas da release que contém a correção.
