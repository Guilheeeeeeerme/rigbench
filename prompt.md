# PROMPT MESTRE v2 — RigbenchPalco (orientação ao palco, Pt/EN)

> **Uso:** entregue este arquivo como briefing único a um agente de código em
> sessão nova. Ele descreve o estado ATUAL do app (o redesign "Circuito & Documento"
> já foi implementado), o novo objetivo (o app é **uma ferramenta de palco**),
> e todas as peças que faltam. As pastas `docs/plans/` e `docs/palco/` são leitura
> de referência; **este arquivo prevalece** em caso de divergência.
> Idioma de resposta: siga o idioma do usuário. Código, commits e comentários: inglês.

---

## 1. Papel e contexto do projeto

Você implementará a evolução do **Rigbench** — app web static (React 19 + Vite +
TypeScript + Web MIDI, sem backend) que edita o pedal Roland GR‑55 direct via
SysEx. Repositório: pasta raiz deste arquivo. Node 22, `npm run dev` (Vite,
localhost:5173), Chrome/Edge para testar (Web MIDI + SysEx).

Camada intocado (jogáveis pelo playbook, mas NÃO REESCREVER):
- `src/protocol/**` — mapa de campos Roland (~9.6k linhas), checksums RQ1/DT1.
- `src/midi/**` — `session.ts` (MidiSession, identify), `access.ts`.

Camada que VOCÊ vou trabalhar: `src/devices/gr55/**`, `src/app/**`, `src/copy/**`,
`src/devices/registry.ts`.

### Estado atual (já implementado, commits b4427fb…3c375a8)
- Scope chips 🟠/🟢/🔵 + contextual bar + unsaved-count + guard de troca de patch.
- Router visto de rotas (HashRouter): `#/gr55/setup`, `#/gr55/patches`,
  `#/gr55/editor/:bloco/:secao`, `#/gr55/palco`, DeviceHome.
- Editor em **cadeia de sinais + inspector** e cabeçalho de documento
  (save/save-as/revert) — `Canvas.tsx`, `SectionView.tsx`, `Workspace.tsx`.
- Biblioteca é a home pós-conexão com cartões + busca + import/export `.syx`
  + **backup system .syx name** — `Library.tsx`, `syx.ts`.
- Domínio dispositivo v1: perfis de instrumento local (`profiles.ts`), backup,
  troca GUITAR/BASS protegida — `DeviceScreen.tsx`.
- Modo Palco v1 (leitura, fontes grandes, mapa de pedais) — `Stage.tsx`, `stageInfo.ts`.
- Todos os textos em `copy/en.ts`; busca de campos — `FieldSearch.tsx`.

## 2. O novo objetivo, em uma frase

O Rigbench vira um **app de palco**: você conecta o pedal, ele é **configurado**
(instrumento/GK/saída/MIDI), **sincronizado por completo (297 patches + system,
com progresso constante)**, e daí para frente você vive no **Palco** — setlist
por música, cortes por pedal dentro do patch — e a edição de efeitos/patches é
uma zona secundária alcançada a partir do Palco.

Fluxo canônico (um único caminho, sem bifurcação):

```
Selecionar dispositivo → Conectar (Identity Request)
  → [se primeira vez] Wizard de Configuração (checklist)
  → Sincronização total (progresso global constante)
  → PALCO (tela raiz, a partir daqui)
       ├─ pisar ADV EDIT → editor (cadeia + inspector) / Biblioteca
       └─ pisar DISPOSITIVO → configuração avançada
```

## 3. Mapa de navegação final (IA fechada)

```
/                          DeviceHome (seletor de dispositivo)
/gr55/conectar             identidade MIDI + seleção de porta (já existe)
/gr55/configurar           Wizard pré-palco (NOVO, check-list 8 passos §5)
/gr55/palco                ★ TELA RAIZ pós-config (§7)
/gr55/agenda               Setlist (ações por música)         [sub-área do Palco]
/gr55/patches              Biblioteca dos 297 slots (sync-aware)
/gr55/editor/:bloco/:secao Editor (cadeia + inspector, já existe)
/gr55/dispositivo          Domínio Sistema (expandido, §6)
/gr55/dispositivo/gk       Editor de GK Sets (NOVO, §6.1)
```

Regras de IA (o "app faz sentido"):
- **Máxima profundidade: 3 cliques** de qualquer tela a qualquer tela útil.
- O **selo de sync** vive no cantão de TODAS as telas (`SINC ▓░ U64:1 · 64/297`
  → `PRONTO ✓ 297/297` → `Δ 7 divergentes`). Modal de sync.
- Chivo de escopo essencialmente em todo controle (🟠 patch · 🟢 slot · 🔵 sistema).
- Voltar, Trilha de contexto no app (nada de bury); refresh não perde contexto
  (rotas + cache).
- Nunca destruir silenciosamente: diff + confirmação nomeada antes de qualquer
  gravação de slot, e nunca gravação ativa enquanto o Palco está aberto.

## 4. Suporte de idioma (EN + PT-BR) — i18n primeira classe

Estado: todos os textos em `copy/en.ts`. Requisito final:

1. Extrer `src/copy/` para dicionários **estruturados por chave**:
   `src/copy/en.ts` (fonte da verdade) e `src/copy/pt-BR.ts` (traduções 1:1).
   API: `src/copy/index.ts` exporta `t(key, params?)` + `useT()` hook; contexto
   `LocaleProvider` no topo do app.
2. **Detecção**: `navigator.language` na 1ª visita → seleção persistida em
   `localStorage` → alternador fixo **EN | PT-BR** no rodapé de todas as telas e
   no Wizard (passo 0, antes de tudo, porque pessoas que falam apenas PT serão o
   público primário de onboarding).
3. **Todo** texto novo obrigatoriamente via `t()`; zero strings hardcoded em JSX.
   Adicionar um script/lint (**`npm run check:copy`**) que confronta en.ts × pt-BR.ts
   pelas mesmas chaves e falha o build em divergência/chave faltante.
4. **Labels de enums do aparelho** (PCM tone names, MFX types, PU TYPE…): os
   dados do mapa de protocolo ficam em inglês **como estão no pedal** (não traduzir
   dados do dispositivo); a camada de UI fornece rótulos traduzidos para os enums
   curados (GK PU TYPE, OUTPUT SELECT, tipos de MFX/delay/chorus/reverb, SOUND
   STYLE) com fallback para o valor bruto. Nunca traduzir nomes de synth/amp.
5. Números/formatos: medidor de progresso e ETA com plural possáis des
   língua ("63% concluído" / "63% complete").

## 5. Wizard de Configuração pré-palco (NOVO)

Rota `#/gr55/configurar`. Check-list sequencial, cada passo com terminação ✅/⚠️;
o usuário pode "continuar assim mesmo" com ⚠️, mas o Palco mostra o resumo como
aviso. Passos (pesquisa: `docs/palco/00-pesquisa-configuracao-pre-palco.md`):

1. **Idioma + nome do rig** (pt/en + "Meu rig de Saturday").
2. **Modo do pedal** 🔵: GUITAR / BASS (leitura atual + troca protegida com modal
   "afeta os 297 slots"; troca re-baixa banco de presets).
3. **Instrumentos conectados** 🔵: para cada cavo (lista local):
   nome, **PU TYPE** (GK‑3 · GK‑2A · PIEZO · PIEZO F Fishman · PIEZO G Graph Tech
   · PIEZO L L.R. Baggs · PIEZO R RMC / baixo: GK‑3B · GK‑2B · PIEZO · PIEZO G ·
   PIEZO R), **SCALE** (mm, presets ST 648 / LP 628 / bass SHORT 760 …), **GK PU
   POS** (só baixo), **PU PHASE** (NORMAL/INVERSE), e **SENS por corda** com
   **medidor ao vivo** (toque forte → barra até o máximo; Training Guide Roland).
   Cada instrumento fica associado a um **GK SET 1–10** (§6.1).
4. **Saída** 🔵: OUTPUT SELECT (tipo de amp/FOH) + **GUITAR OUT SOURCE** (NORMAL PU
   / MODELING / BOTH) — para monitoração.
5. **Pedais** 🔵: revisar a camada SYSTEM › PEDAL/GK CTL (atribuições **globais de
   todos os patches**) e explicar as 3 camadas (system › patch MASTER › assigns 1–8).
6. **MIDI/USB** 🔵: PC RX SWITCH (receber program change), canal, soft thru.
7. **Backup** : ler system completo + 297 slots e oferecer `.syx` único (dialogo:
   "isto demora ~X min").
8. **Sincronizar tudo** → barra de progresso global (§8) → "PRONTO" → Palco.

## 6. Domínio Sistema expandido (NOVO — extensão de mapa)

Hoje o mapa system tem só `GUITAR/BASS Select`. Implementar (endereços: 16 LSBs de
`System` no `midi.xml` do FloorBoard — *leitura de referência somente, sem copiar
texto GPL*; o fork MIT CASouthEast/gr55-remote-main (commits 2026‑01 "System
SysEx parsing rewrite", "System GK Finally done") é a **fonte MIT** a seguir):

- **GK SET 1–10** (§6.1), rendem em `#/gr55/dispositivo/gk`.
- **OUTPUT SELECT · GUITAR OUT SOURCE · PEDAL/GK CTL · MIDI/USB · LCD/POWER**.
- Leitura do **system completo** (live ~1,2 KB em blocos de 128; full dump ~52 KB)
  para backup `.syx` — já existe backup de nome; expandir ao domínio.

### 6.1 Editor de GK Sets (o "perfil de instrumento" real do pedal)
- Lista dos **10 sets** com **nome editável (8 chars)**; cartão selado com
  "guitarra SG + GK‑3", "Godin Multiac…".
- Formulário por set: PU TYPE, SCALE, GK PU POS, PU PHASE, SENS 6 corda.
- **Calibração interativa**: medidor por corda, instrução do Training Guide
  ("barra chega ao máximo apenas nas notas mais fortes").
- Ligação: perfil local (profiles.ts) ↔ GK set ↔ lista de patches que apontam
  `GK SET = SYSTEM` (MASTER do patch). Trocar instrumento na sessão = trocar
  GK SET ativo + resaltar patches afetados.

## 7. Palco (a tela raiz) — melhoria sobre o v1

- **Setlist**: lista de músicas (nome livre → slot). Ações por item: testar,
  editar, remover, reordenar (drag). Guardada em localStorage; exportável como
  JSON (compartilhar setlist).
- **Cenas dentro do patch** (o conceito central, comunitário: 1 patch por música
  por causa do **gap de som ao trocar de patch**): exibir "cortes" = assigns 1–8
  + EXP/CTL por patch, com **nomes humanos** ("Verso", "Solo: EXP abre filter").
  Cenário "cena atual" estimada do estado dos pedais (leitura assigns em .raw).
- **Mapa dos pedais físicos** (CTL1 · CTL2 · EXP/GK · FS1‑3) com destino + estado
  ao vivo, e aviso vermelho se o set ao pular o patch ("pedal mudo ~1 s").
- **Reflexo de teclado**: setlist com "próxima música usado."  N.",
- De cada bloco do Palco: link "editar →" para `#/gr55/editor` correspondente.

## 8. Motor de sincronização (NOVO — coração da etapa)

**Alvo**: ler system completo + **os 297 user slots + modificações do buffer**
e cachear localmente; o pedal não empurra nada (sys Reaper data push — é RQ1 poll)

Design:
- **Fila de RQ1 por patch** com pacing **adaptativo**: começa seguro (gr55-remote:
  256 bytes/msg, gap 20 ms, timeout 5 s) e sobe até oscilar; benchmark na 1ª sessão.
- **Cache incremental em IndexedDB** (conteúdo por slot + checksum); sync seguinte
  compara checksums e só conserva relatif divergentes → "Δ 7 divergentes".
- **Resumível**: carregar página desligar/reinício (USB caiu): continua do ponto,
  cache nunca é descartado sem diff.
- **Progresso universal** no canto fixo de todas as telas (3 estados: SINC por
  patch N/297 + ETA/castra · PRONTO + timestamp · Δ divergências). Clicando
  abre detalhe (fila, pausar, cancelar). никогда modal bloqueante exceto
  1ª configuração.
- Biblioteca (cards), Palco (setlist) e Wizard leem **do cache**:
  card com dados incompletos deixam de estar tiradas mocks transparentemente.
- Escrever NEUNHUMA coisa durante sync (fila separada, prior bleibt: pedal surdo
  ~3 s por write, nunca durante palco).

## 9. Fases de entrega (ordem fixa, cada uma com aceite)

**Fase A — i18n** : LocaleProvider, `t()`/`useT()`, migração total de copy,
pt-BR completo, alternador + detecção, script `check:copy`.
✅ Nada de string hardcoded; trocar idioma muda 100% da UI sem reload.

**Fase B — Sync engine + cache**: fila RQ1 adaptativa, IndexedDB, progresso
universal, resumível, diff incremental; Biblioteca alimenta do cache.
✅ 297 slots baixos com EBTA visível; reload da página reinicia do ponto;
segunda sync lê apenas divergentes.

**Fase C — Sistema expandido + GK Sets**: modernização de map (source MIT
CASouthEast), editor GK Sets com medidor ao vivo, OUTPUT SELECT, GUITAR OUT,
PEDAL/GK CTL, MIDI/USB; wizard §5 integrando tudo.
✅ Wizard completo com 8 passos + GK set calibrado sem abrir o manual.

**Fase D — Palco raiz**: full Palco rework (setlist + cenas + pedal map +
teclas), wizard→sync→Palco landing, editor abaixo do Palco.
✅ Do zero ao som ajustado no palco em < 5 min; nenhum gap silencioso sem aviso.

**Fase E — Coesão + testes**: `gr55.test.ts` (fakeDevice **simula pacing/CQ1 e 297
bulk**); testes feitos de怎 sync resume + diff; teste de i18n; auditoria de IA
(3 cliques, chips, zero catch-all); README atualizado; screenshot check for both
idiomas; atualizar `docs/plans/00-summary.md` com nota "v2 implementada".

## 10. Guardrails (não negociáveis)

- Camada `src/protocol/**` e `src/midi/**`: sem reescrita; extensões de mapa system
  entram em arquivo próprio seguindo padrão existente.
- **Licenças**: nada do GR FloorBoard (GPL) — texto, XML, skins — enters the repo;
  dados/informação de endereço valor protocolo (fatos), não trechos GPL; novo
  código do fork MIT CASouthEast só com atribuição.
- **Zero jargão** na UI ("buffer", "SysEx", "write", "global" = usa glossário:
  cópia de trabalho · slot · gravar · aplicar · sistema 🔵).
- Cada gravação: diff + slot nomeado + aviso "pedal surdo ~X s"; palco proíbe gravação.
- Performance: renders por campo (useSyncExternalStore) mantidos; sync em Web Worker
  prudente (não bloquear UI); sem dependências novas pesadas.
- Prettier/ESLint/testes: `npm run build` e `npm test` passando em bo cada fase.

## 11. Fontes de verdade

- `docs/palco/00-pesquisa-configuracao-pre-palco.md` — GK sets, OUTPUT SELECT,
  GUITAR OUT, 3 camadas de pedal, gap de patch, sync numbers.
- `docs/plans/01-fundacoes.md` — personas (GK‑3 · violão piezo · baixo),
  código de êscops, telas fixas.
- `docs/plans/00-summary.md` + planos 1–11 — decisão de IA já implementada.
- `research_notes/Ecossistema de software GR55/protocolo_midi.md` — RQ1/DT1,
  pacing, escrita lenta, dumps.
- Código atual: `src/devices/gr55/*` (ver §1).
