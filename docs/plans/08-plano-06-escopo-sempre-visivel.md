# Plano 6 — Escopo Sempre Visível (a camada de confiança)

> **Metáfora:** o app não muda de estrutura — **cada controle, cabeçalho e ação
> ganha uma legenda visual de escopo**: 🟠 existe agora (buffer), 🟢 será salvo no
> slot, 🔵 afeta o pedal inteiro. É a resposta *direta à reclamação original*
> ("não sabemos o que estamos atualizando — global, local, por patch") e é a
> menor unidade de design que pode ser aplicada em 1 sprint sobre *qualquer*
> arquitetura (inclusive sozinha sobre a atual).

---

## 1. O princípio

Nenhuma dúvida de escopo deve passar por raciocínio: **a resposta está na tela,
junto do controle, na cor e na palavra**. Este plano não cria navegação nova,
novo fluxo de save nada: é uma **camada semântica declaratória** sobre o que já
existe. Por ser transversal, funciona como "first mile" imediato e como
requisito perpetuo para qualquer plano 1–11.

## 2. Modelo mental

> "Tudo que eu toco anuncia, no lugar, o que acontece com aquilo."

## 3. A especificação (fundações §2, aplicada — ou sozinho)

### 3.1 Chips de escopo (padron, último o word)

| Estado | Chip | Aparece |
|---|---|---|
| Editando cópia de trabalho | `🟠 patch` | em **todo** controle patch |
| Escrita permanente | `🟢 slot U14:2` | na ação "Gravar" e nos cards da Biblioteca |
| Sistema/global | `🔵 pedal` | modo GUITAR/BASS, tuning, MIDI, LCD |

Regra: cor + ícone **e** palavra. Acessibilidade > estética.

### 3.2 Cabeçalho de contexto (resumo global, sempre no topo)

```
🟠 Cópia de trabalho · 14 alterações não salvas  ·  🔵 Pedal: GUITAR
```
Estado dinâmico: a contagem muda com cada write; 0 alterações = "comparando com U14:2".

### 3.3 Função "antes de agir": resumo do que vai acontecer

Antes de qualquer escrita real ao pedal, uma placa (texto simples, não modal em 90%
dos casos):

```
Gravar em U14:2 → substitui permanentemente o slot.
🟢 Será tocado no palco do modo atual.
🔵 Esto não toca no sistema.
⏳ Pedal fica surdo ~3s — não pise nos pedais.
   [Gravar] [Cancelar]
```

### 3.4 Quando aplica — a tabela canônica (para copiar de fundações)

| Você faz | Onde aplica | Cor | Perde se… |
|---|---|---|---|
| Gira knob no app | buffer temporário (som AGORA) | 🟠 | trocar de patch no pedal |
| Gravar em slot | memória user | 🟢 | nunca (até gravar de novo) |
| Mudar GUITAR/BASS | sistema | 🔵 | nunca (até mudar) |
| Girar knob no pedal físico | buffer temporário | 🟠 | trocar de patch |

**A quarta linha é um recurso novo**: o app **espelha** knob físico no buffer — ao
girar knob do GR-55, o app redesenha o valor (o editor já consome `onData`; formalizo
com badge 🟠 "tocando pelo painel do pedal"?). Isso garante o usuário: buffer é real.

## 4. Tela (só as camadas sobre a IA atual)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🟠 Cópia de trabalho (cópia de U14:2) · 14 alterações · 🔵 GUITAR│
├────────────────┬────────────────────────────────────────────────┤
│ Patch          │ (sem ideia nova: mesma página de parâmetros)   │
│ PCM 1          │  Som [0029 Grand Piano] 🟠patch               │
│ PCM 2          │  Nível ────●──── 82  🟠patch                  │
│ …              │  …                                             │
├────────────────┴────────────────────────────────────────────────┤
│                 [Gravar em U14:2 🟢]  (com flare de escopo)      │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Personas

- **A (GK‑3):** assigns = chip 🟠 e explicação na linha: "afeta só este patch".
- **B (violão piezo):** perfil do instrumento = chip 🔵: "aplica ao pedal inteiro".
- **C (baixo):** o guard-blue ganha força extra: nenhuma escrita de sistema sem chip 🔵.

## 6. Casos de uso

| # | Situação | Antes (hoje) | Com este plano |
|---|---|---|---|
| 1 | Girar knob sem entender | muda som sem saber por quanto tempo | consta 🟠 + contador no header |
| 2 | Fechar aba | perde alterações silenciosamente | header mostra 14 não salvas |
| 3 | Write em slot | pop confirmação "tem certeza?" | resumo de escopo subpeço, incl. slot de destino |
| 4 | Pedal pisado | — | Knob físico mudou 🟠 — visível |
| 5 | Instrutor ensina aluno | — | aponta o chip no lugar |

## 7. Modo Palco

O banner âmbar do Modo Palco (fundações §3.4) é obrigatório: se a cópia tem
alterações não gravadas e você sobe ao palco, o palco mostra: **"o pedal tocando
agora é a cópia, não o slot; alguns knob físico desliga e são perdidos"**.
Zero ambiguidade de "tocσει ou não tocará o que eu ajustei".

## 8. Avançado

Este plano não muda densidade. Aplicável dentro dele também os planos de nível
(Essencial/Avançado) — chip de escopo independente de densidade.

## 9. Terminologia

"Cópia de trabalho", "Alterações não salvas", "Gravar em slot", "Pedal" para global.
Nunca "edit buffer", "SysEx", "delivery".

## 10. Implementação

- `FieldControl` → chip de escopo ao lado de cada label (1 variante).
- `Workspace.tsx` → barra de contexto persistente (mudanças contador).
- `Gr55Editor` → `changeCount` e `getSnapshot(field)` já suportam? Fácil: diff.
- `Librarian.tsx` → "Write here" com placa de escopo pré-operação.
- Tên RTK defer: **caminho mais barato (1–2 sprints) para tirar "tiro no escuro"**.

## 11. Trade-offs

- **Pró:** barato, aplicável hoje sobre a navegação atual; resolve a queixa no
  injunction; compatível com TODOS os planos (encadeante).
- **Contra:** não reorganiza nada — 15 abas planas continuam entrosando;
  usuário avançado não ganha nada. É o plano "dano-c reasonably" → combine‑se
  com qualquer um (ou seja precusorado independentemente).

## 12. Critérios de aceite

1. Enquanto só um controle de patch tem chip de escopo visível — 100% dos 692.
2. Barra de contexto presente em todas as telas, com contagem sempre sincrono.
3. Ações de escrita: placa de "antes de agir" com pendências listadas.
4. Teste de cego: 10 users(("essa mudança fica?" "se eu desligo o app agora?"))
  respondem certo sem erro.
