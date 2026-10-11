# Plano 1 — Modelo Documento (Pages/Keynote)

> **Metáfora:** cada patch é um *documento* que você abre, edita, salva e fecha —
> exatamente como uma apresentação no Keynote. O buffer temporário do pedal deixa de
> ser um conceito invisível e vira o estado natural de qualquer documento: **a cópia
> editada e ainda não salva**.

---

## 1. O princípio

Toda a ambiguidade de "o que estou atualizando" morre com um único compromisso:
**nunca existe edição sem um documento aberto, e todo documento mostra seu nome+estado
o tempo inteiro**. O pedal's edit buffer é reinterpretado como "documento aberto";
gravar em slot user é **Salvar**; sair do app com alterações pergunta; trocar de
patch no pedal **fecharia o documento sem salvar** — e a UI avisa antes.

## 2. Modelo mental (o que o guitarrista aprende em 10 segundos)

| Ação real | Verbos do app |
|---|---|
| Girar knob no painel físico | "Editar o documento que está aberto" (punho âmbar aparece) |
| Pisar e mudar de patch no pedal | "O documento aberto será(executa descartado)" → aviso |
| Write to slot (pedal) | "Salvar" |
| Copiar patch para outro slot | "Salvar como…" |
| Read from pedal | "Reabrir original" (Reverter) |

## 3. Navegação

```
Página inicial DeviceHome
└─ /gr55  (conexão)
   └─ Documento aberto (Workspace)
      ├─ ┌ Barra de título do documento ────────────────┐
      ├  │ ● Blues Riff — cópia de U14:2   ▲14 não salvo│
      ├  │ [Salvar] [Salvar como…] [Reverter] [Palco]   │
      ├─ Conteúdo do documento (abas internas, ver §5)
      ├─ Biblioteca (janela separada, como Open Panel)
      └─ Instrumento (Preferências do app, não do documento)
```

Dois níveis de configuração espelham Keynote:
- **Preferências do app** → Instrumento/conexão/blue (global).
- **Configurações do documento** → tudo que vai no patch (por patch).
A pergunta "isso é global ou do patch?" é respondida pelo **lugar éon it**.

## 4. Tela do editor

```
┌──────────────────────────────────────────────────────────────────┐
│ ● Blues Riff · cópia de U14:2 · 14 alterações não salvas          │
│ [Salvar] [Salvar como…] [Reverter]   | Biblioteca | Instrumento  │
├──────────────────────────────────────────────────────────────────┤
│ [Trecho] [Efeitos] [Saída] [Controle]      ← 4 abas do documento  │
├──────────────────────────────────────────────────────────────────┤
│  Trecho › PCM 1                                                   │
│   Som: [ 0029 · Grand Piano ]  Nível: ────●──── 82                │
│   Pan: ────●── 63   Octave: −1   Mute: [ ]                        │
│   ▾ Avançado (TVA, TVF, LFO… 48 parâmetros)                       │
├──────────────────────────────────────────────────────────────────┤
│ 🟠 Alterações tocam no pedal AGORA. Salvar escreve em um slot.    │
└──────────────────────────────────────────────────────────────────┘
```

- ###Guarda-chute no fechamento: se o usuário desligar/trocar patch com ● punho, modal
  `?"Blues Riff" tem 14 alterações não salvas. Pisou para outro patch e elas somem.`

## 5. Abas do documento (curadas, teardown interno)

**Trecho** (fontes de som — vocabulário da wish list 2011–2025):
PCM 1 · PCM 2 · Modelagem · Captador normal · Sub-mistura (níveis/pan por fonte + EQ se existir).
**Efeitos**: MOD/MFX · Delay · Chorus · Reverb. **Saída**: EQ master · Master. **Controle**: Assigns 1–8 · CTL1/2 · EXP/GK · com nomes.

## 6. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | Começo do dia | Abre app → conecta → "U14:2 aberto automaticamente (era o patch executando)" |
| 2 | Ajusta o drive para o ensaio | Gira Knob → ● punho · tocando é ouvir na hora |
| 3 | Gravar o resultado | `Salvar` → escolhe U14:2 (mesmo slot) ou `Salvar como…` → U17:1 com novo nome. Modal advsspedal ficará mudo 3s |
| 4 | Arrependimento | `Reverter` volta ao estado ORIGINAL do slot |
| 5 | Baixou .syx da comunidade | `Salvar como…` a partir de arquivo; depois editar |
| 6 | Configura violão novo | Instrumento (preferências) → perfil azul/sistema |

## 7. Escopo neste plano

O "quando aplica" fica **físico pelo documento**:
- 🟠 punho + contagem = cópia de trabalho (som AGORA).
- Verde só na Biblioteca (slots saved).
- Azul só na janela Instrumento (sistema).
É **o único plano** em que a distinção global/local é *posicional* (arquivo), não só colorida.

## 8. Nível avançado

Cada bloco tem "▾ Avançado" colapsado. Avançado ≠ local enorme: são grupos nomeados
(TVA envelope, LFO, Assign detail). "Mostrar tudo" nunca é o padrão do documento.

## 9. Modo Palco = "Play" (Keynote)

Tela cheia a partir do documento: nome + status grande, mapa de pedais (ver
fundações §3.4). Herda o aviso âmbar do documento — se sair do Modo Palco trocando
patch no pedal, o modal-b discinina avisa. **Mesma linguagem, sem regra nova.**

## 10. Terminologia

Salvar / Salvar como… / Reverter / Duplicar / Documento / Cópia de trabalho /
"N alterações não salvas". Nunca "write", "dump", "buffer".

## 11. Implementação

- `Workspace.tsx` → vira *DocumentWindow*; header do doc → punho e título.
- `Gr55Editor` ganha `revert()` e `changeCount` (diff do `image` contra o snapshot lido).
- **Interceptar troca de patch** (o app hoje re-lê em program change): se ха changes,
  modal antes do re-read — 1 comportamento pequeno elimina o maior destrói silencioso do produto.
- `copy/en.ts` recebe o glossário de salvamento.
- Nota: writing do slot é lenta (fundações §4.2) → `Salvar` com progresso.

## 12. Trade-offs

- **Pró:** mata a ambiguidade na raiz; 0 jargão MIDI; melhor plano p/ usuário novo.
- **Contra:** não reorganiza os 15 blocos (a sonoridade interna continua a mesma, só
  com abas mais curtas); depende de disciplina em TODA copia textual/futuro para que
  "salvar" nunca se perca. Usuários hardcore podem achar "proteção" atrito.

## 13. Critérios de aceite

1. Em nenhuma tela é possível não resposta "o que faço se desligar agora?".
2. Trocar patch no pedal com ● alterações → aviso antes de descartar.
3. Salvar mostra progresso e proíbe pisar pedais enquanto escreve.
4. Busca "document" mental: usuário novo não vê a palavra "buffer" em lugar nenhum.
