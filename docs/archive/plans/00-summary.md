# Redesign do Rigbench — Summary dos 11 planos

> **ARCHIVED.** Stage-era “v2 implementada” note below is historical; craft home
> is now Studio — see [AGENTS.md](../../../AGENTS.md) and
> [docs/current/studio-sessions.md](../../current/studio-sessions.md).
>
> Perguntas de fundação que todo plano responde: **o que é global, o que é local,
> o que é por patch?** · **Onde configuro o instrumento (GK‑3, violão piezo, baixo)?**
> · **Onde vejo/edito meus patches?** · **Sabendo o que acontece ao pisar cada pedal?**

| # | Arquivo | Plano | Metáfora | O que conta |
|---|---|---|---|---|
| 1 | [03-blaino…]() | **Modelo Documento** | Keynote/Pages | patch = documento salvo/revertido; buffer = "não salvo" |
| 2 | 04-… | **Configurações Agrupadas** | macOS System Settings | 5 grupos curados + busca; subfolder tudo |
| 3 | 05-… | **Cadeia de Sinal** | Logic/GarageBand | canvas com ordem do sinal + missão assigns como cabos |
| 4 | 06-… | **Inspector Fixo** | Keynote inspector | árvore à esquerda, inspector à direita, sempre |
| 5 | 07-… | **Essencial/Avançado** | Apple defaults | ~40 knobs curados; 692, com switch |
| 6 | 08-… | **Escopo Sempre Visível** | confiança | chips 🟠🟢🔵 + contador, em todas as telas |
| 7 | 09-… | **Escrita em Estágios** | commit | ledger/diff, aplicar em lote, undo universal |
| 8 | 10-… | **Deep Links URL** | internet | toda tela tem endereço; back funciona |
| 9 | 11-… | **Patch vs Dispositivo** | celular | duas moradias; system isolado e protegido |
| 10 | 12-… | **Biblioteca Primeira** | mesa de trabalho | abre nos 297 slots; test-drive; setlist |
| 11 | 13-… | **Painel Físico** ⭐ | FloorBoard | réplica do painel GR-55: quem conhece, reconhece |

**⭐ = nasceu da pesquisa de comunidade.** [Fundações](01-fundacoes.md) e [Pesquisa](02-pesquisa-comunidade.md) são leitura prévia.

---

## O que todo plano já tipedin

Definidos à mão em [01-fundacoes.md](01-fundacoes.md), e aplicados em cada plano:
- **Personas**: A = guitarra + GK‑3 · B = violão com piezo (Godin etc.) · C = baixo GK‑3B.
- **Código de escopo**: 🟠 cópia de trabalho (some ao trocar patch) · 🟢 slot salvo · 🔵 sistema.
- **4 telas fixas**: Instrumento · Biblioteca · Editor · Modo Palco.
- **Verdades**: buffer temporário é do aparelho; gravação é lenta (3 s surdo); modo G/B é sistema.

## Como combinam (a recomendação da casa)

**Nenhuma sai sozinha.** Combos práticos:

| Combo | O que entrega | Você o escolhe se… |
|---|---|---|
| **6 + 2 + 8 + 9** ("primeiro salto") | chips de escopo sobre grupos curados, URL navegável e divisão Patch/Dispositivo | quer resultado em 1–2 sprints, custo baixo |
| **1 + 3 + 5** ("reboot Apple") | docunning mental + cadeia visual + essencial/avançado | quer A experiência definitiva, custo médio-alto |
| **10 + 6** ("biblioteca como portais") | Biblioteca como home + chips de escopo | o fluxo real é importar/adaptar patch da comunidade |
| **11 + 6** ("FloorBoard Apple") | réplica do painel + chips | sua audiência é a mesma personagem de 2011 que já sabe o painel do pedal |

Super-set possível: **1 (documento) + 3 (cadeia) + 6 (escopo) + 10 (biblioteca) + 8 (URL)**,
com 5 (essencial/avançado) como camada de densidade e 7 (ledger) phase-2.
9 (domínios) fica como regra de arquitetura em qualquer combo (implementação barata).

## Como, sendo realista, cada plano tocaful codebase

| Área | Quem especifica |
|---|---|
| `pages.ts` (IA) | 2, 3, 4, 5, 11 |
| `Workspace.tsx` (shell) | 1, 2, 3, 4, 7, 9 |
| `Gr55Editor` (estado/protocolo) | 1, 7 |
| `Librarian.tsx` → LibraryHome | 10 |
| `FieldControl` (controle) | 0 todos: chips do 6 |
| `copy/en.ts` | todos |
| Router/URL | 8 |

Arquivo auditável por plano, com: modelo mental, árvore de navegação, wireframes,
personas, casos de uso, tabela de escopo, avançado, Modo Palco, terminologia,
implementação, trade-offs e critérios de aceite.

---

## Nota — v2 implementada (2026-10-10)

O briefing arquivado `docs/archive/prompt-v2-rigbench-palco.md` foi implementado no branch `palco-v2`, nas
cinco fases previstas:

| Fase | O que entrou | Onde |
|---|---|---|
| **A — i18n** | `t()` / `useT()`, `LocaleProvider`, `pt-BR.ts` 1:1 com `en.ts`, alternador EN \| PT-BR em todas as telas, `npm run check:copy` | `src/copy/`, `src/shell/LocaleSwitch.tsx` |
| **B — Sync** | Motor de sincronização dos 297 slots + sistema, ritmo adaptativo, cache em IndexedDB, retomada, diff incremental, selo fixo no canto | `src/devices/gr55/sync/` |
| **C — Sistema** | Mapa de sistema (10 GK sets, saída, pedais, MIDI/USB), mudanças preparadas e aplicadas com confirmação, editor de GK sets, wizard de 8 passos | `systemMap.ts`, `systemState.ts`, `GkSets.tsx`, `Wizard.tsx` |
| **D — Palco raiz** | Palco como tela raiz, setlist, cortes nomeados, mapa de pedais, teclas N/P/1–9, aviso de troca de patch | `Stage.tsx`, `SetlistScreen.tsx`, `setlist.ts`, `stageModel.ts` |
| **E — Coesão** | Testes de sync (297 slots sobre MIDI simulado com ritmo real), sistema, palco e i18n; README; navegação única | `*.test.ts`, `README.md` |

Rotas finais: `#/gr55/configurar` · `palco` · `agenda` · `patches` · `editor/:bloco/:secao`
· `dispositivo` · `dispositivo/gk`. Os endereços antigos (`setup`, `device`) redirecionam.

**O que não foi validado em um GR‑55 real** está listado no README, seção
"What has not been checked on a real pedal": endereços de sistema (seguem o fork MIT
CASouthEast), ordem do PU TYPE, codificação do SCALE, GK sets em modo baixo, o medidor
por corda (desenhado a partir das notas Guitar‑to‑MIDI, não do medidor do pedal) e o
ritmo real da sincronização.

Ficou de fora: contraste do LCD, desligamento automático e MIDI soft thru (não mapeados
na fonte MIT), bancos de presets somente leitura, e o Web Worker para a sincronização
(o Web MIDI não existe em workers; a sincronização é E/S assíncrona e não bloqueia a tela).
