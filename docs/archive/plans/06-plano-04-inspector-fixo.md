# Plano 4 — Inspector Fixo (Keynote inspector)

> **Metáfora:** janela imutável de duas colunas — **à esquerda a estrutura do patch
> (árvore), à direita o inspector do que está selecionado**. Você nunca "troca de
> tela": a navegação acontece na árvore, a edição acontece no inspector. É o
> padrão do inspector do Keynote: tudo, o tempo inteiro, a dois cliques.

---

## 1. O princípio

O problema das 15 abas é **perda de contexto**: sair de PCM 1 para ver Assigns e
voltar é contexto perdido. Neste plano não existe página: existe **seleção** +
**inspeção**. Toda navegação é "clicar coisas na árvore"; toda edição é "mover coisas
no inspector". O layout nunca muda — muda só o que o inspector mostra.

## 2. Modelo mental

> "O patch é uma lista de coisas à esquerda. Cliquei na coisa, confiro seus
> ajustes à direita. Zero surpresas de onde estou."

## 3. Navegação

```
App
├─ Conexão (BrowserGate + perfil de instrumento)
└─ Janela única
   ├─ Cabeçalho     patch + escopo + salvar (universal)
   ├─ Árvore        estruturada, colapsável, com search
   └─ Inspector     bloco selecionado
       └─ sub-…modo avançado expande dentro do inspector
```

Estrutura da árvore (o "esqueleto" do patch, não "páginas"):

```
🟠 Patch: Blues Riff (cópia de U14:2)
├─ Comum          nome · atributo · BPM · CTL/EXP
├─ Fontes
│  ├─ PCM 1          ▸.tabPageStatics (collapsed)
│  ├─ PCM 2
│  ├─ Modelagem
│  │  ├─ aGuitarra › aBass_Model (pages)…
│  └─ Captador normal
├─ Camadas          (mixage: níveis/pan/off por fonte)
├─ Efeitos
│  ├─ MOD/MFX      (escolhidos hide/SHOW por tipo)
│  ├─ Delay · Chorus · Reverb
├─ Saída           EQ · Master
├─ Controle
│  ├─ Assign 1–8   (tabela:  source→target→min/max)
│  └─ CTL1 · CTL2 · EXP/GK
└─ Informação      slotorigem, PC/Bank, checksum… (leitura)
```

## 4. Tela

```
┌──────────────────┬─────────────────────────────────────────────┐
│ ● Blues Riff     │        ◀ PCM 1                              │
├──────────────────┤  🟠afeta a cópia de trabalho                 │
│ 🔍 filtrar árvore│ ──────────────────────────────────────────  │
│ ▾ PATCH          │  Som            [ 0029 · Grand Piano ▾ ]    │
│   ├ Comum        │  Nome exibido    Grand Piano                 │
│   ▸ Fontes       │  Nível  ─────────●────────  82               │
│   ▸ Camadas      │  Pan    ─────●──────────  63                │
│   ▾ Efeitos      │  Octave   [ −1 ▾ ]  Mute [OFF]               │
│     ├ MOD/MFX    │ ────── Envia para ──────────────            │
│     ▸ Delay      │  MOD/MFX ───●── 30  Delay ──●── 20          │
│     ▸ Chorus     │  Chorus ─────── 0    Reverb ─●── 55         │
│   ▸ Saída        │ ─────── Avançado ▾ ────────────             │
│   ▸ Controle     │  | TVA envelope · TVF · LFO · offsets |      │
│   ▸ Informação   │   ▸ TVA attack/decay/sustain/release…       │
├──────────────────┴─────────────────────────────────────────────┤
│ 🟠 3 alterações · [Salvar] [Biblioteca] [Instrumento 🔵] [Palco] │
└─────────────────────────────────────────────────────────────────┘
```

- O envio "por fonte" aparece **dentro de cada fonte** (wish list da comunidade).
- `▸ Informação`: de que slot veio, PC/Bank, e **diff contra o slot** (o que mudou).

## 5. Personas

- **A (GK‑3):** árvore Controle › Assign 3 é sempre o clique nº 4 — tree somável
  (re-open feature: nó aberto persiste enquanto patch vivo).
- **B (violão piezo):** clique Fontes › Modelagem, desliga "electric", liga Acoustic.
- **C (baixo):** antes de abrir árvore, o cabeçalho azul destaca o modo; a árvore
  em si é modo-agnóstico (comportamento muda por map, não por UI).

## 6. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | "Mudei PCM1, quero ver como afeta chorus" | seleta Chorus → inspector mostra os 4 sends现场的 — contexto mantido |
| 2 | Achar o param X sem saber grupo | barra de filtro tree match inline |
| 3 | Conferir assigns rapidinho | Controle colapsado a tabela-parse 1 screen |
| 4 | Ver exatamente o que alterei | Informação › diff (per plan pode usar listagem por bloque,§7) |
| 5 | TIviola plugou | Instrumento no footer (só escreve GUITAR/BASS se confirmado) |

## 7. Escopo

- **Chip de escopo na linha do título do inspector** + no cada grupo.
- Barra de footer resume estado global (fundação §2) — as cores âmbar/verde/azul.
- Rodapé fixo significa: "sempre dá para ver o status do documento onde quer que você esteja" ✅.

## 8. Avançado

Dentro do inspector: "▸ Avançado" por grupo, e "Modo completo" exibirá todos os parâmetros
do modelo + hidden by conditional (como hoje "show all effects" — retido, mas renomeado
para "mostrar parâmetros de todos os tipos de MFX").

## 9. Modo Palco

Botão no footer. Mesma tela de fundações §3.4 com um extra: **"Editar bloco X" no
clicar de cwd cable — reacender a janela do patch no inspector apropriado.** Palco
↔ inspector tornam-se os dois pólos de leitura e edição.

## 10. Terminologia

"Árvore", "Inspector", "Bloco", "Camadas". Nada de "página", "aba", "formulário".

## 11. Implementação

- `Workspace.tsx` → nova shell única; `SectionView` → conteúdo do inspector (quase sem
  mudança, ganha sidebar-accordion rails);
- `pages.ts` → **vira a configuração de árvore** (nós + ordem + que esconde).
- `FieldControl` intact; nova `InspectorTree` (~1 componente novo).
- Estado de seleção em `useSyncExternalStore` já cobre re-render fino por campo —
  história de performância ✓.

## 12. Trade-offs

- **Pró:** menor mistura mental (tudo sempre visível); melhor p/ power user e
  comparação rápida; ~60% dos espelho do FloorBoard pública + 40% Apple polido.
- **Contra:** tela pequena (laptop 13") fica apertada com árvore+inspector;
  novato preguiçoso pode navegar menos visão geral (não vê cadeia sem extensão).

## 13. Critérios de aceite

1. **Zero navegação que perca edição em curso** (fixture: aberto no MFX, clicar
   Assign, voltar — MFX ainda "on" e expandido).
2. Toda queda de contexto é impossível (painel imutável, same frame sempre).
3. 692 campos alcançáveis → árvore + Avançado + Grade total no inspector.
4. Footer/universal estado constante.
