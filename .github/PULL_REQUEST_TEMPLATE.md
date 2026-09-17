# Pull Request

## O que este PR faz

<!-- Descreva a mudança em uma ou duas frases. -->

Closes #<!-- número da issue, se houver -->

## Tipo de mudança

- [ ] `fix` — correção de bug
- [ ] `feat` — novo recurso
- [ ] `docs` — documentação
- [ ] `refactor` — mudança interna sem alterar comportamento
- [ ] `perf` — desempenho
- [ ] `test` — testes
- [ ] `build` / `ci` — build, dependências ou integração contínua
- [ ] `chore` — manutenção

## Como foi testado

<!-- Comandos rodados, cenários verificados, plataformas. -->

```
npm run check
npm test
```

- [ ] `npm run check` passa
- [ ] `npm test` passa
- [ ] Testei a interface gráfica (se a mudança afeta a UI)

## Plataformas verificadas

- [ ] Linux
- [ ] Windows
- [ ] macOS

<!-- Se não testou em alguma, diga qual e por quê. -->

## Checklist

- [ ] A mudança resolve **um** problema e o escopo está descrito acima
- [ ] Código novo relevante tem teste em `test/` (runner nativo `node --test`, sem framework novo)
- [ ] O `README.md` foi atualizado se a mudança afeta uso, flags ou estrutura de arquivos
- [ ] Nenhum segredo, chave de API, `.env` ou dado pessoal no diff
- [ ] O isolamento de contexto (`contextIsolation`, `sandbox`, `nodeIntegration`) segue intacto
- [ ] Nenhum recurso de interface passou a ser carregado por CDN
- [ ] Dependências novas foram justificadas abaixo

## Dependências novas

<!-- Liste e justifique, ou escreva "nenhuma". -->

## Notas para quem revisa

<!-- Decisões de implementação, pontos de atenção, alternativas descartadas. -->
