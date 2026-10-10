# Plano 2 — Configurações Agrupadas (macOS System Settings)

> **Metáfora:** o app inteiro é o "Ajustes" do GR‑55 — barra lateral com grupos
> curados ícone + campo de busca no topo, como o System Settings do macOS. Guitarrista
> pensa "quero mexer no chorus" → clica no grupo **Efeitos** → acha. Nunca mais as
> 15 abas planas digestão.

---

## 1. O princípio

A hierarquia atual deriva de *prefixos de chave* (`startsWith('amp')`...), e "Master"
é literalmente "tudo que sobrou". Este plano joga isso fora: **grupos curados à mão,
com título e significado explícito**, e um campo de busca que atravessa os 692 campos.
Busca é o equalizador entre novatos e avançados: novato navega, avançado digita.

## 2. Modelo mental

> "Todo ajuste do meu rig tem um lugar nomeado. E se eu não souber o lugar,
> eu **busco**."

## 3. Navegação (árvore completa, curada à mão)

```
🔍 buscar parâmetro…            (índice dos 692 campos + labels PT)

INSTRUMENTO            🔵 escopo global
├─ Meu instrumento (perfis, GK‑3/piezo/baixo)
└─ Sistema do pedal    (GUITAR/BASS, MIDI, USB)   ← lenta, confirmada

MEUS PATCHES           🟢 escopo slot
└─ Biblioteca reader (297 slots, busca, import/export .syx)

SONS DO PATCH ATUAL — "cópia de trabalho de U14:2"   🟠 escopo patch
├─ Fontes        (PCM 1 · PCM 2 · Modelagem · Captador normal)
├─ Camadas       (níveis/pan/mudo por fonte — "o que toca junto")
├─ Efeitos       (MOD/MFX · Delay · Chorus · Reverb)
├─ Saída         (EQ · Master)
└─ Controle      (Assigns 1–8 · CTL1/2 · EXP/GK)
```

- As 15 abas planas viram **5 grupos com hierarquia de 2 níveis**.
- Cada cabeçalho de grupo diz seu escopo na frase de entrada:
  *"Tudo aqui vai dentro do patch que você está editando"*, *"Isto é global"*.

## 4. Tela

```
┌────────────────┬───────────────────────────────────────────────┐
│🔍 buscar…      │ Efeitos › Chorus                            │
│                │ 🟠 afeta só a cópia de trabalho             │
│ Instrumento 🔵 │ ─────────────────────────────────────────  │
│ Meus patches 🟢│  Chorus ligado? [ ON ]                      │
│────────────────│ Tipo: [Rich]  Nível ────●── 82              │
│ Sons do patch 🟠│ Rate ──●── 0.6Hz   Depth ──●── 40          │
│ › Fontes       │ Em sincronia com BPM do patch [ ]           │
│   ≳ Camadas    │ ── Enviar de ──                             │
│   Efeitos      │  do PCM1: ──●── 30   do PCM2: ───●── 45     │
│ › Saída        │  do Modeling: ──●── 40  do Capt: ───── 0    │
│ › Controle     │ ▾ Avançado: id9             [ além ]        │
└────────────────┴───────────────────────────────────────────────┘
```

Nota os 4 sliders "sends": esta é a resposta à wish list (EQ/controle por fonte) —
camadas de envio por fonte ficam visíveis onde o novato também as vê.

## 5. Personas

- **A (GK‑3):** busca "sustain" → cai em Controle › Assigns com targets nomeados.
- **B (violão piezo):** entra em Fontes › Modelagem › "Acoustic", liga piano de PCM 1 ao lado. Grupos por fonte contam a história certa.
- **C (baixo):** grupo Instrumento › Sistema com o selo azul grande ANTES de tocar no modo; grupos reinicializam com o banco de baixo.

## 6. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | "Tem delay aqui dentro?" | busca "delay" → 1 hit + contexto de grupo |
| 2 | "Onde baixo o nível do synth?" | Camadas › PCM 1 (fisicamente junto dos irmãos) |
| 3 | Muda chorus em 6 patches |Эта plan + tabela: bulk edit na Biblioteca (ver §12) |
| 4 | Novo violão plugado | Instrumento (azul), com confirmação grande |
| 5 | "O que o pedal pisar faz?" | Controle › Assigns + botão "Ver no Palco" |

## 7. Escopo

Três grupos laterais com chip de cor **no menu** (🔵🟢🟠) e nos cabeçalhos. A barra de
busca classifica resultados por escopo com filtros fixos: `[Todos] [🔵 global] [🟠 patch]`.

## 8. Avançado

Cada página de grupo tem "Mostrar todos os N parâmetros" (substitui a regrinha por
prefixo atual). Busca encontra params elissos mesmo quando ocultos — "descobrir
pelo nome" é o fluxo do avançado.

## 9. Modo Palco

Botão fixo no topo direito do sidebar ("Ver no Palco") — leva ao §3.4 das fundações
p/ o patch atual. Dentro do Palco, cada item "tocável" linkea de volta ao grupo do
sidebar (CTL1 → Controle › Assigns › Assign 1).

## 10. Terminologia

"Instrumento", "Meus patches", "Sons do patch atual", "Camadas" (o termo de camada
arrastava dos synths é o que a comunidade usa), "Controle".

## 11. Implementação

- `pages.ts` → reescrito como **addEventListener of curated groups** (o "catch-all"
  morre); deixado mower to remove the "Other" bucket by design.
- `copy/en.ts` → todos os novos rótulos.
- Busca = índice em memória sobre `RolandGR55AddressMap.ts` (descrição+grupo); custo 0.
- `Workspace.tsx` → sidebar com 3 seções de chips escopo.

## 12. Trade-offs

- **Pró:** menor esforço por efeito tamanho; mata o "catch-all"; busca resolve tudo.
- **Contra:** curadoria é subjetiva; dois agrupamentos ok mal podem esconder
  params. Não muda o model mental de save (escojo:hidden ainda é "tudo já aplica").

## 13. Critérios de aceite

1. Nenhum campo fica fora de grupo (grep zera "Other").
2. Qualquer campo achável por busca em ≤ 2 cliques a partir do hit.
3. Toda página de grupo declara seu escopo na 1ª letra.
4. Bulk edit potencial (marcar "aplicar aos slots selecionados" na Biblioteca).
