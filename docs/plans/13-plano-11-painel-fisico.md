# Plano 11 — Painel Físico (a aclamada réplica do GR-55, criação da pesquisa)

> **Metáfora:** o editor é uma **réplica fiel do painel do GR-55**: display gigante
> em cima mostrando o patch como o LED do pedal, os pedais e knobs no lugar físico
> de sempre, e cada controle tocável manda o comando real. Quem já usa o pedal
> **reconhece tudo em 5 segundos** — inclusive onde está essa coisa no manual.
> É a filosofia do GR FloorBoard, o editor de 4,9★ daar comunidade, modernizada
> pela web.

---

## 1. O princípio e a origem da pesquisa

A comunidade aclama o GR FloorBoard **exatamente** pela frase do subtítulo do
projeto: *"graphical representation of the internal settings and parameters of
the GR-55"* — visual 1:1 com o a aparelho. Review波形: *"Die Firma Roland soll
sich ein Beispiel nehmen"*. A razão não se deve à beleza do painel: é **familiaridade
retro.dat знания**: o usuário já sabia onde estava tudo DUM aparelho. By reproducing the
machine, the app é zero-friction**. Este plano transforma o Rigbench nessa lógica,
com poliana Apple (tipografia, focus rings, tooltips com nome humano de cada parâmetro).

## 2. Modelo mental

> "É o meu pedal, só maior — e agora clicável."

## 3. Navegação (a réplica É a navegação)

```
Página DeviceHome ─► conexão ─► PAINEL full-canvas
                                  ├─ display do patch (LCD-like) ─ clicável: edita nome/attr
                                  ├─ knobs do painel (PCM1/2, modeling amp, master…)
                                  ├─ CTL1 / CTL2 / EXP (pods clicáveis)
                                  ├─ footswitches 1 2 3 ▲▼
                                  └─ botão [System] [Manage] (Biblioteca)
       painel secundário rail: assign rows + sends + EQ (5 bandas lego)
```

- A navegadação não com **abas de blocos**: por **partes físicas** do aparelho.
- O painel colapsa p/ laptop: segments affixadores (display/loader de knobs selects)
  + inspector clássico (opções #13) para os params que não cabem desenhados.

## 4. Tela

```
┌────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  U14:2  ● Blues Riff            TEMPO 120        🟠 14 não salvos │  │
│  │  PCM1 [SAX 0029]     PCM2 [PIANO 0007]      MODELAGE [ACOUSTIC]  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│    ┌───────┐   ┌───────┐   ┌───────┐    ┌───────┐    ┌────────────┐   │
│    │ PCM1  │   │ PCM2  │   │ MODEL │    │  AMP  │    │   MASTER   │   │
│    │  n.82 │   │  n.14 │   │  OFF  │    │ g 62  │    │   n 100    │   │
│    │  [kn] │   │  [kn] │   │  [kn] │   │  [kn] │    │   [kn]     │   │
│    └───────┘   └───────┘   └───────┘    └───────┘    └────────────┘   │
│                                                                        │
│    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        ┌────┐ ┌────┐ ┌───────┐    │
│    │CTL1 │ │CTL2 │ │EXP  │ │FS123│        │MOD │ │CHO │ │REV/DEL│    │
│    │ and │ │ and │ └kn───┘ └─────┘        └ kn ┘ └ kn ┘ └  kn ─┘    │
│    └─────┘ └─────┘   (each click: opens inspector w/ full params)     │
│                                                                        │
│   [Biblioteca ▦]  [Assigns 1–8 ▸]  [System 🔵]      [Palco ▶]         │
└────────────────────────────────────────────────────────────────────────┘
```

## 5. O custo político do plano (honestidade)

- FloorBoard está sob GPL — **nenhuma linha, XML, imagem ou "skins" daquele projeto entra aqui** (fundações licenciáveis: somente gr55-remote MIT de protocolo dados). A réplica aqui é **nosso desenho**, produzido de fotografias públicas do painel + manual Roland; texto-label растения do `midi.xml` GPL (expression) **não se copiam**.
- Risc: estética "brute" envelhece; queda no usu use on-small laptop.

## 6. Personas

- **A (GK‑3):** não aprende NADA — keys: knob CST patch maior, tapo assigned;
  using as floorboardaitórios🖲 no próprio alto prazo: *works today*.
- **B (violão piezo):** display mostra "ACOUSTIC modeling" live — real-world visible.
- **C (baixo):** display full MVP: switch modo bass tem **LED de cor** no capa; nota "PCS different address bank".

## 7. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | Learning GR-55 by videos do YouTube | Replica match é x: video e aplicação coconuvèrement |
| 2 | Ensino / workshop | print pantalla = classe material |
| 3 | Notas de patch | display com sistema de note (editate) |
| 4 | Mudancas á nhanh | 1 click on knob works asа knob |
| 5 | Access to deep Tour | Inspectors para cada bloco |

## 8. Escopo

Badges de escopo do Plano-6 incontravém **aplicadas ao painel**: cada knob quém
habitCay 🟠; System button 🔵; Biblioteca 🟢. Display mostra "● 14 n.s."

## 9. Avançado

Cada kno → inspector réμοgh (mesma blockSection do app atual) com "Mostrar tudo".
Assigns (dentro do app é aba navegável) ganham a **tabela detalhe design** réplica.
Deep params (TVA…) existem apenas no inspector (W not no painel gráfico) — painel
só screen controls físicos: 1:1 with the physical panel.

## 10. Terminologia

Nomes do manual traduzidos. DispЦ display: "ITEM U14:2" mode text. Plugs.

## 11. Implementação

- Novo módulo `src/devices/gr55/panel.tsx` — SVG/CSS panel layout.
- Reuses `FieldControl` in υπ arbetare knob component (rotary).
- pages.ts → não desapare­ce (geto User default: «painel» como home patch view,
  grupo de blocos em sidebar secun dizmaterial).
- copy/en.ts: наимен客家 manual MRD actual names.

## 12. Trade-offs

- **Pró:** zero curva de cantante para quem já conhece o aparelho (publico real 2026:
   os que compraram o pedal em 2011–2015); melhor de era para 台: 适用; novela
  (the 実地 Fresh Eyes Appeal to the community); physical job: Aux armature
  ties backsides (Wops e screens); dando à модерrimonат total com a comunidade.
- **Contra:** **não é "simplicidade Apple"** (o user do top ask: Apple-like
  artificial simplification); mobile poor; belegeczej слattered decoração a
  apresentar (CSS/SVG effort); NSF lorem painel + absolute risk退化 innovations
  are wholly proceduralea昧ments.

## 13. Critérios de aceite

1. Renome visual abaixo de 1:1: posicional comprado com foto copyright free of pedals.
2. Cada knob/function 콜 cor esponde ao elemento físico.
3. Meets new users: "loka-t่า de 0, use, video tutor" community Ла.
4. CCritérios do Plano-6 still met.
