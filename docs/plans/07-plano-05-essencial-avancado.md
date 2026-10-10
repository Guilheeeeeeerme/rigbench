# Plano 5 — Essencial / Avançado (progressive disclosure)

> **Metáfora:** o padrão do app é o modo **Essencial** — os ~40 parâmetros que
> 95% dos guitarristas mexem, expostos com estética e affordance impecáveis. Um
> único switch global abre o **Avançado** — os 692 campos, todos, organizados.
> É a filosofia Apple hard-coded: default poderoso, profundidade a um clique.

---

## 1. O princípio

A UE de três validações independentes coloca o corte no mesmo lugar:
- o roadmap do gr55-web-editor (2026) mapeia **205 campos ≈ "95% do uso diário"**
  e chama TVA/TVF/LFO/system de "power-user territory";
- a curadoria do app já existe parcialmente ("mostrar só os fields do tipo atual");
- a comunidade pede por **fontes** (wish list) — o essencial é narrar fontes, camadas,
  efeitos e o pisar dos pedais — e o avançado narra o resto.

O problema atual não é *existência* de hierarquia, é que o app hoje **expõe tudo
com o mesmo peso visual**: novato se afoga em 692; expert perde tempo com layout
plano "OUTRO" dos prefixos.

## 2. Modelo mental

> "O app abre inteligente, mostrando o que importa. Quando eu ficar demais
> for advinson, o switch 'Avançado' resto ao usuário se resolve."

## 3. O que é "Essencial" — especificação curada (em `copy/en.ts` + `pages.ts`)

| Grupo | Essencial (~campos) | Fica no Avançado |
|---|---|---|
| Comum | nome, atributo, BPM, nível, CTL/EXP função | assign de CTL, detalhes GK, utili |
| PCM 1/2 | tom, nível, pan, octava, mute, tuning | TVA/T­VF envelopes, offsets, LFO |
| Modelagem | tipo de modelo, nível, pan, mute, tuning | tuning específico de modelo, sensitivity, cada micro param |
| Captador normal | nível, tipo/captação | EQ por fonte detalhado |
| Amp | tipo, gain, EQ, nível | curva, cab, impulsos |
| MOD/MFX | tipo, on/off, 5–8 params do tipo |Os outros 20–40 por tipo |
| Delay/Chorus/Reverb | tipo, time/rate, feedback/depth, level, sends | resolução numérica, master sends |
| EQ | 5 bandas + EZ Character | Q opcional |
| Controle | assign 1–8: source → target → min/max/ligado | ACT range, mode detail, invertido |
| Sistema 🔵 | GUITAR/BASS + curiosidades | tuning master, MIDI/USB, LCD |

Estrutura de modo Essencial/Avançado: **por grupo** (cada seção tem switch), com um
macro "Modo avançado global" no footer que liga todos de uma vez. Estado persiste
por sessão (localStorage). Sem sobrescreverá escolha por campo visível depois.

## 4. Tela Essencial (só o coração)

```
┌──────────────────────────────────────────────────────────────────┐
│ ● Blues Riff (cópia de U14:2)           [voltar atrás?] [Palco]  │
├──────────────────────────────────────────────────────────────────┤
│ FONTES                     │ EFEITOS                              │
│  PCM1  [Sax     ▾] ─n 82   │  Modo MFX    [OCTAVE   ▾]  [ON]     │
│  PCM2  [Piano   ▾] ─n 14   │  Delay t=460ms f/b 42% n 64  [ON]   │
│  Modeling [Acoustic] [OFF] │  Chorus n 30  [OFF]                 │
│  Captador   n 74  (só)     │  Reverb n 55  [ON]                  │
│                            │                                      │
│ AMP                        │ CONTROLE (o que os pedais fazem)     │
│  [Clean Twin] gain 62      │  CTL1  → Add Reverb   min/max 0–127  │
│  bass 4 mid 6 treb 5       │  CTL2  → PCM2 s/on-off               │
│  n 80                      │  EXP   → PCM1 n. volume              │
├──────────────────────────────────────────────────────────────────┤
│ ⚙ Modo essencial · alternar [ todos os 692 knobs ] (Avançado)    │
└──────────────────────────────────────────────────────────────────┘
```

Tudo em uma tela. O "aviso" de quem buonga: "Tem 652 controles escondidos?"
– genericamente invisível, mas honesto = signal longuinho.

## 5. Tela Avançado

Mesma IA do Plano 2 (grupos curados + busca), com **tudo** exposto e labeled.
Modo avançado nunca é outra app: é o mesmo material com densidade máxima.

## 6. Personas

- **A (GK‑3):** organiza-se com assign targets qualificados como Essencial — os 10 min/max tres toggle; TVA etc. ficam longe.
- **B (violão piezo):** liga Acoustic, piano PCM1 — tempo até o 1º som: < 30 s.
- **C (baixo):** avança porque precisa de system 🔵 GUITAR/BASS — que fica
  em 2 cliques sempre visível no Intelligent Mode.

## 7. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | 1ª conexão, 1º timbre | Modo Essencial → 40 knobs; adjustments to sound em < 2 min |
| 2 | Quer sustain de GK via assign | Controle Essencial (assigns já estão) |
| 3 | Creative deadline (edit TVA) | Avançado por grupo → PCM1 › Avançado |
| 4 | Copy do editor 2026 (205 de 692) | Similar, coherente com #1 |
| 5 | Bulk de 30 patches | Avançado global + esse punho se bem |

## 8. Escopo

- Essencial cores **audio = patch 🟠** por definição; o único 🔵 (modo do pedal)
  aparece **fora** e contrastado, pois "escusa fora do patch".
- Diferenças de escopo / global são chamadas na tela do fundação §2.

## 9. Avançado — como saber você está lá

Switch está stateful, header mostra chip grande "AVANÇADO ●" e fundo da seção fica
levemente mais denso. Nunca passive (o avançado vira o padrão de novo) — visible
"Essencial" button sempre no header superior.

## 10. Terminologia

"Essencial", "Avançado", "Por grupo", "Todos os 692".

## 11. Implementação

- `pages.ts` → cada FieldDefinition ganha tag `essential?: boolean` (1 curadoria file).
- `SectionView` → renderiza conditionally with mode; registrar estado em
  `localStorage` por bundle; switch global no footer.
- `copy/en.ts` → glossary.
- **Custo escondido:** a curadoria essencial é trabalho de design + testes reais com
  musics 5–10 patches leitura — é a parte difícil, não o código.

## 12. Trade-offs

- **Pró:** melhor "primeiro dia de usuário" de todas os planos; arraigra o vocab
  comunidade (fonts/camadas); custo de código baixo, custo de curadoria médio.
- **Contra:** não resolve "não sei se é global ou patch" (fundações de cor cobrem);
  qualquer curadoria mal feita esconde feature importante (assigns: testado) —
  por isso assigns NÃO podem ficar de fora do Essential.
- Não muda navegação: melhor **combinado** com Plano 2 ou 3.

## 13. Critérios de aceite

1. Novato far 1 timbre (violão + synth) sem nunca ligar Avançado (5/5 testes).
2. Nenhum controle essencialmente útil>Email assigns/CTL/EXP) fora do Essential.
3. Avançado mostra 100% dos campos de um modelo; UE EsEssencial um subconjunto label
   o link "onde está o resto".
4. Estado Essencial/Avançado persiste por grupo/block no localStorage.
