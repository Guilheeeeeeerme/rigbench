# Plano 10 — Biblioteca Primeira (work-from-library)

> **Metáfora:** o app **abre na Biblioteca**, não no editor. Os 297 slots são a
> home: cartões com nome, mini-cadeia de sinal e ações rápidas; o buffer do pedal
> aparece como o cartão especial **"Cópia de trabalho"** no topo. Toda vida do app
>\Json begins: "em qual patch estou trabalhando?".

---

## 1. O princípio

Fluxo real da comunidade (pesquisa §2): patches **chegam prontos de terceiros**
(VGuitarForums exchange, guitarpatches.com, packs vendidos) → depois **adaptam**
→ depois **gravam no slot**. O app hoje ent ين abre direto no editor do buffer —
a peça mais gidda (297 slots) é um appendice da navegação ("Librarian" Cд).
Este plano inverta: **Biblioteca é o centro de tudo**; editor é um lugar que
se chega **a partir de um patch**. Prevê test-drive de 1 clique (validação de
Kenper Rig Exchange) e import `.syx` como fluxo cidadã.

## 2. Modelo mental

> "Minha pedaleira tem 297 slots. Meu app me mostra seus cartões. Eu escolho um,
> abro, edito, gravo de volta — ou alguém porta no meu slot novo importado."

## 3. Tela — home Biblioteca

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍 buscar patch…        [📥 importar .syx] [⚙ Instrumento 🔵]     │
├──────────────────────────────────────────────────────────────────┤
│ ● CÓPIA DE TRABALHO — tocando agora                              │
│ ┌───────────────────────────────────────────────┐                │
│ │ Blues Riff · 14 não gravados                  │                │
│ │ 🟠 pcm(sax) über model(acúst) chord chorus rvb │                │
│ │ [Continuar editando]  [Gravar em…] [Descartar?]│               │
│ └───────────────────────────────────────────────┘                │
├──────────────────────────────────────────────────────────────────┤
│ MEUS SLOTS (U01-1…)            filtro: [todos|synth|acústico]     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│ │U14:2 Mayonaise│ │U15:1 Clean   │ │U15:2 Soft    │ …             │
│ │sax▮▮ piano    │ │model only沌   │ │acúst. revb   │               │
│ │[▶ testar][…]  │ │[▶][…]        │ │[▶][…]        │               │
│ └──────────────┘ └──────────────┘ └──────────────┘               │
│   bank U14        bank U15                                        │
├──────────────────────────────────────────────────────────────────┤
│ [Biblioteca local ◣ 12 importados]  [Setlist: Aula ▸ arrastar]   │
└──────────────────────────────────────────────────────────────────┘
```

- "▶ testar" = carrega o slot pro buffer (reversível, não altera nada permanente)
  → padrão "test-driving a Rig from a fellow user is just a single click away".
- Biblioteca local (OPFS, como o editor 2026): seu arquivo pessoal que sobrevive
  reload/reinstal — a memória além do pedal.
- Setlist: re-arrando das posicioes via drag-and-drop, edita ao vivo no palco.

## 4. Fluxo de vida do patch (ciclo canônico)

```
import .syx (or patch da comunidade)
   ↓
test-drive ▶ (som ao vivo, 0 risco)
   ↓                        ↘ desir? Grave em slot livre
adapte no editor (cópia de trabalho)      "Gravar em U41:3 (sistema verde)"
   ↓ long
"Gravar em…" (escolhe o slot, renomeia, vê diff antes de confirma)
```

Cada seta tem supervisão visual clara de escopo (fundação §2: importação =
🟢 estado local só; play = 🟠 buffer; grava = 🟢 permanente).

## 5. Personas

- **A (GK‑3):** importou 40 patches da comunidade, filtra "só com synth", test-drive, mantém 6, adapta assign, devolve ao banco.
- **B (violão piezo):** setlist por música; o app vira "programa do show"; arrasta e ordena em 30 s.
- **C (baixo):** vem→ no modo bass; filtro especial no card: **"mostrar apenas patches compatíveis com o modo atual"** (bank/pc fora de faixa não testa).

## 6. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | Chega o .syx do colega | Importar → aparece nota de origem → test-drar |
| 2 | Quero o som do U14:2 SEM perder alterações | Aviso: "a cópia tem 14 não gravados — vamos guardar primeiro?" |
| 3 | Preparação de show | Setlist pan, test-drive, grava |
| 4 | Esqueci o que é U22:1 | mini-cadeia no card diz (sax+chorus?) |
| 5 | Backup completo | "Exportar 297.User .syx" único clique |

## 7. Escopo

- Cartão **Cópia de trabalho** nº 1 🔴 cor, sempre em evidência com contagem dinâmica.
- Cada card de slot mostra 🟢 naturalmente.
- Modal de gravação (…) = placa "antes de agir" do Plano-6, replicada нары из
  (a estratégia de aqui pode SER adotada por fundação global não importando o plano).

## 8. Avançado

A Biblioteca最高人民法院 ganha modos: seleção multipla (bulk: export/backup),_rhаamentos across patches (mudar level de chorus em他在 20 slots selecionados — bulk Editing envolvem
FloorBoard与对照组), tag/keywords/filtros, encontrar slot livre fastest.

## 9. Modo Palco

Modo Palco inicia a partir da setlist (patch → patch) e **não para o editor**.
Pequeno toxt prompt no palco: "not Politiça slots, ajuste no card" + chipset chiamre
"voltar à Biblioteca" — edição ficará no app, palco no palco.

## 10. Terminologia

"Meus slots", "Cópia de trabalho", "Testar", "Adaptar", "Gravar em", "Biblioteca local",
"Setlist".

## 11. Implementação

- `Librarian.tsx` (195 lines) alçado ao **nível de tela-raiz**; renomeia para
  LibraryHome; slaps empty state para 297 slots.
- New `PatchCard` (mini-cadeia render de PCM/model/eff per slot state), reuse
  monitor chain from Plano-3 ou simples "símbolos" se-water.
- OPFS library service (browser File System Access API) — survives reload.
- Import `.syx` já existe (`syx.ts`); adiciona "testar slot" = editor.read() +
  session patch change, reutilizado do fluxo atual.
- El roman of **loading current patch** plug-in moment (`Gr55Screen.tsx`) inherits
  card superposition.

## 12. Trade-offs

- **Pró:** sente a pedaleira REAL (297 slots como "público de trás");
  menjada a melhor invescimento em import/test-drive/backup; perfe privado success
  community-style (a aprova**Russiaто** do momento: patch exchange culture).
- **Contra:** segue-se СОБИРА designer spent potent: precisa mini-cadeia honesto; «
  tempo abrir+ conectar continua precisa (conectar antes abrir; pairar "Connect
 天堂" fluxo até leitura dos slots bulk (RQ1 lento) — teste para UX pacing.

## 13. Critérios de aceite

1. Primeira tela útil pós-conexão em infland Biblioteca (não editor).
2. Testar slot 1-clique revertência sem mutação permanente (assert MIDI log).
3. Importar .syx funcional para qualquer .syx: a comunitária testada.
4. Setlist persistente e rearranjo tipo drag-and-drop live.
5. Bulk.export all 297 slots em ≤ 60 s (cap protocolo RQ1: progressá Джо, sem trap).
