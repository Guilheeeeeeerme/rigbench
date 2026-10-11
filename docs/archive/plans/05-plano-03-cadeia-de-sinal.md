# Plano 3 — Cadeia de Sinal Visual (Logic/GarageBand)

> **Metáfora:** o editor é um **rack virtual**: você vê o fluxo do sinal do seu
> instrumento → fontes de som → efeitos → saída, na ordem real, como blocos
> encadeados. Clicar num bloco abre seus parâmetros. A navegação é **enxergar o
> circuito do seu som**, do jeito que um guitarrista já pensa.

---

## 1. O princípio

Guitarristas pensam em **cadeia** (keyboardista Kemper/Helix/Axe-Fx usersconfirmam).
O painel de 15 abas planas esconde a coisa mais importante do GR‑55: **o que toca
junto e em que ordem**. Este plano torna o simultâneo visível: PCM 1 e PCM 2 rodam
em paralelo, a mistura entra na MOD/MFX, e depois chorus → delay → reverb → EQ.

Refinamento da pesquisa de comunidade: FloorBoard venceu os corações imitando o
painel físico. Aqui, a metáfora evolui uma geração: **não o desenho do LCD do pedal,
mas o diagrama mental que o manual tenta ensinar** — com os parâmetros a 1 clique.

## 2. Modelo mental

> "Meu som é um caminho: o que entra da guitarra/violão passa por aqui, em ordem,
> e sai na saída. Cada pedal pisado muda um desses blocos."

## 3. As duas visões do mesmo dado

| Visão | O que mostra | Quando |
|---|---|---|
| **Cadeia (default)** | blocos em ordem de sinal, com ramificações ideais | editar entendendo o fluxo |
| **Grade (avançado)** | todos os campos por bloco num grid | "hair-splitting" de patch (TVA, assigns detalhe) |

## 4. Tela — editor

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ● Blues Riff (cópia de U14:2)          [Salvar] [Biblioteca] [Palco ▶]  │
├──────────────────────────────────────────────────────────────────────────┤
│  ENTRADA          FONTES DE SOM            EFEITOS            SAÍDA     │
│                                                                          │
│  🔌 GK-13 pin ─┐   [ PCM 1 · sax ]────┐   ┌────────┐                    │
│  🔌 P-10 1/4"──┤   [ PCM 2 · piano ]─┼──►│ MOD/MFX│──┐                 │
│  (GK setups)   │                     │   └────────┘  │                 │
│                │   ● Modelagem COSM ─┤   ┌────────┐  │                 │
│                │       (acústico)    └──►│ CHORUS │◄─┤                 │
│                │   ● Captador normal ──► └────────┘  │                 │
│                │                                     │                 │
│                │      [ CAMADA: mixagem eviden ] ─── └──► [DELAY]     │
│                │                                          │ [REVERB]   │
│                │                                    ┌──────────┐        │
│  ● blocos ON      (cinza = OFF)                     │ EQ MASTER │──► 🔊 │
│                                                     └──────────┘        │
│──────────────────────────────────────────────────────────────────────── │
│ INSPECTOR ▾  PCM 1 › som │ Nível 82 │ Oct −1 │ (escolhendo…)          │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Blocos desligados ficam cinza** — a visualização responde como o som.
- **Inspector fixo embaixo** (single row) com os params do bloco clicado.
- Camadas: níveis/pan/mute de cada fonte num "painel de mistura" inline.

## 5. Assigns desenhados como cabos ⭐

O diferencial deste plano: **o pisar de pedal ganha geometria**. Cada assign 1–8
é desenhado como um cabo do pedal físico até o bloco que ele afeta:

```
   [CTL1]────"ADD REVERB"────► REVERB (ligaria)
   [CTL2]───"MFX on/off"─────► MOD/MFX
   [EXP/GK]──"PCM1 volume"───► PCM 1
   [FS 1-3]──troca de patch (padrão Roland)
```

Caminho para a pergunta fundação do usuário: **"quando pisar CTL1, o que
acontece?"** → resposta visual sem ler assigns numéricos. Targets nomeados
(535, pesquisáveis — padrão do editor web 2026).

## 6. Personas

- **A (GK‑3):** vê de cara o 3-canal (PCM+modeling+captador) ligado em paralelo — os patches "/inputoc" do usuário ficam legíveis.
- **B (violão piezo):** blocos "Captador normal" ligado + Modelagem "Acoustic" off: entender o que está tocando é literal.
- **C (baixo):** os mesmos blocos em modo baixo; cadeia muda com o sistema (aviso azul quando perfil baixo ativo).

## 7. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | "Por que o reverb não afeta o synth?" | Ver a cadeia: reverb está após o mixer, sends por fonte explicam |
| 2 | Pisar CTL1 agora | Cabo CTL1 anima, bloco-alvo pisca — simulado sem pegar guitarra |
| 3 | Camada piano+sax | Ligar 2 blocos fonte com slider de mistura natural |
| 4 | Comparar com preset da comunidade | Cadeia do atual vs `.syx` lado a lado (blocos ON/OFF) |
| 5 | Liga chorus e ouve | Clique → [ON] → toca na hora (☐ focused: o pedal já recebe) |

## 8. Escopo

- Cada bloco tem chip 🟠 (por patch). Sistema 🔵 surge como "bandeira no topo":
  `🔵 modo GUITAR` porque o modo condiciona a cadeia inteira.
- A Biblioteca (green) é a tela irmã com as mesmas cadeias em miniatura nos cards.

## 9. Avançado

Inspector abaixo tem toggle "Avançado" por bloco. **Grade** (visão tabela) fica
sempre disponível via botão — "não me force por diagrama" para o power user.

## 10. Terminologia

"Entrada / Fontes / Efeitos / Saída", "Cadeia", "Cabo" (assign), "Bloco".
Nunca "struct", "offset", "MIDI address".

## 11. Implementação

- `Workspace.tsx` → substitui abas por **canvas + inspector** (2 layouts).
- `pages.ts` → deixa de ser "páginas" e vira **grafo**: nós, ordem, cabo desenhado
  de assign→target (licença foi dado no `RolandGR55AssignsMap.ts`).
- `SectionView`/`FieldControl` continuam (são o conteúdo do inspector).
- Aviso: o canvas não é drag-drop da ordem (a ordem é do aparelho); drag acabaria de
  mentir. Blocos são clicáveis, não móveis.

## 12. Trade-offs

- **Pró:** única IA que ensina GR‑55 de graça; simultaneidade, Spaß e assigns
  visíveis; melhor plano para pessoa de 0 a 20 patches (o foco real do app).
- **Contra:** layout horizontal exige tela larga (mobile sofre → fallback lista);
  "render de cadeia" é mais design por parametro; side: por bloco clicável.

## 13. Critérios de aceite

1. Novato responde "o que pisar CTL1 faz?" sem abrir o manual (teste em 3 pessoas).
2. Estado ON/OFF dos blocos conta a verdade do pedal ao vivo (sync com buffer).
3. TODOS os 692 campos acessíveis: cadeia (blocos) + Grade (tabela) por patch.
4. Assigns aparecem como cabos no mínimo nos targets mais comuns (MFX, MIX samplings).
