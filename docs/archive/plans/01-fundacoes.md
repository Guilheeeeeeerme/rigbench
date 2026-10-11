# Fundações comuns — aplicáveis a todos os 10 planos

> Este documento define as peças que **não mudam** de plano para plano: as personas
> (tipos de instrumento que o usuario conecta), o sistema de código visual de escopo,
> as quatro telas fixas que toda arquitetura precisa ter, e as regras de verdade
> sobre o GR‑55 que a UI precisa respeitar. Cada plano (02–11) assume tudo que está
> aqui e só especifica o que faz de diferente.

---

## 1. As três personas de instrumento

O GR‑55 tem **duas entradas de som**: a entrada GK de 13 pinos (captação dividida,
hexafônica, "entende nota por nota") e a entrada P‑10 de 1/4" (sinal comum de qualquer
captação). O modo do pedal — GUITAR ou BASS — é **configuração de sistema**: afeta
todos os patches de uma vez, muda a lista de presets e não se troca por música.

| Persona | Instrumento | Como conecta | O que usa no GR‑55 |
|---|---|---|---|
| **A — Guitarrista elétrico com GK‑3** | Guitarra comum com freio GK‑3 fixado no corpo | GK‑3 → 13 pinos; o sinal da captação comum vai embutido no cabo 13‑pin | PCM 1 + PCM 2 (synth) + Modelagem COSM + captador normal, todos simultâneos. Assigns 1–8 são o coração do uso: sustentação, swell, tap tempo |
| **B — Violonista com piezo** | Violão com captador embutido (piezo), tipo Godin Multiac, Takamine etc. | Alguns por P‑10 (sinal só do navio); modelos Godin "SA" saem por 13 pinos | Modelagem de violão acústico + um tom PCM no refrão (piano, sax). Menos assigns; mais histori: "um patch por música" |
| **C — Baixista com GK‑3B** | Baixo com captador GK‑3B | 13 pinos, e o pedal **precisa estar em modo BASS** | Bancada de preset diferente (90 presets de baixo), modelagem de baixo. O "olhos" do app precisam saber de modo antes de abrir qualquer editor |

**Consequência de arquitetura que nenhum plano pode ignorar:**
1. O app sempre sabe **qual instrumento está conectado** e mostra isso antes de qualquer outro conteúdo.
2. A troca GUITAR ⇄ BASS é a única escrita de **sistema** que o app faz, e sempre com confirmação e aviso de altura de impacto ("afeta todos os 297 slots").
3. Perfis de instrumento (ver §3.1) existem **só no app** (localStorage) — o pedal não tem esse conceito.

---

## 2. O sistema de escopo visual ( translated on every plan )

A pergunta originária do projeto: **"não sabemos o que estamos atualizando — global, local, por patch?"**. A resposta é um código visual obrigatório em *todos* os planos:

| Sensível | Cor | Significado | Persistência |
|---|---|---|---|
| **Cópia de trabalho** | **Âmbar** 🟠 | Está alterando o buffer temporário do pedal — muda o som AGORA, some quando outro patch é chamado | some ao trocar de patch ou ligar/desligar |
| **Patch salvo** | **Verde** ✅ | Gravação permanente em um slot user (U01:1 … U99:3) — o que vai tocar amanhã | permanece no slot | 
| **Sistema / Instrumento** | **Azul** 🔵 | Parâmetro global: afeta TODOS os patches (modo GUITAR/BASS, sensibilidade GK, MIDI) | permanece no pedal |

Regras de aplicação:
1. **Todo controle** mostra um chip de escopo ao lado do rótulo. Nunca admite dúvida: `● Amp` com chip âmbar significa "estou mudando a cópia de trabalho".
2. O **cabeçalho** sempre resume estado: `🟠 14 alterações não gravadas · 🔵 Sistema: Guitar`.
3. Cores e rotulo nunca separam: cor **e** palavra (acessibilidade daltonismo: a cor âmbar/verde/azul vem sempre acompanhada de ícone ou palavra).
4. Escopo "por patch" e "cópia de trabalho" são na verdade **o mesmo dado** (buffer temporário); verde só aparece quando a gravação acontece. Por isso a UI fala sempre em **cópia de trabalho**, e "slot salvo" só na Biblioteca.

---

## 3. As quatro telas fixas

### 3.1 Instrumento (configuração)
Tela de contexto do "quem está plugado". Estado guardado no browser.

```
┌─ Instrumento ───────────────────────────────[ editar ]──┐
│  👤 Perfil: "Gibson SG + GK-3"          [ wechselv ]   │
│  🎸 Tipo:     Guitarra elétrica                        │
│  🔌 Captação: GK-3 (13 pinos) + 1/4" embutido no GK     │
│  ** Modo do pedal: GUITAR **            [ trocar ]     │
│       🔵 global — afeta todos os 297 slots user        │
│  ⚙ Sensibilidade GK: [ herdar do pedal ]               │
│  { similares: "Godin Multiac Piezo", "GR-55B bass " }   │
└─────────────────────────────────────────────────────────┘
```
- Multiple perfis podem coexistir: "guitarra SG", "Godin Multiac 13‑pin", "baixo Fender".
- Ao conectar o pedal pela primeira vez, o app pergunta "o que você tocava?" e cria o perfil.
- O trocar de perfil **não mexe no pedal** (só o GUITAR/BASS é escreve de verdade), e o app deixa isso claro.

### 3.2 Biblioteca (297 slots)
Lista com preview do conteúdo, não tabela crua:
- Slots agrupados por banco U01…U99, com **vista de cadeia** (mini‑cadeia de sinal) no card: `PCM(sax) ● Modelagem(violão) ● Chorus ● Reverb`.
- Filtro "só patches com synth", "só acústicos", busca por nome.
- Ações: Carregar pro editor, Gravar slot atual, Comparar 2 slots, Exportar `.syx`, Apagar slot (com confirmação dupla).
- **Nunca destrutivo sem confirmar**: escrever slot acima de outro primeiro mostra diff.

### 3.3 Editor (doc. de edição)
Cada plano desenhe de um jeito (é aqui que os planos divergem), mas todos:
- Trabalham sobre a **cópia de trabalho** (âmbar), nunca diretamente sobre o slot.
- Mostram de onde a cópia veio: `cópia de U14:2 · Blues Riff` no topo.
- Têm **nível avançado** dentro de si (nunca fora).

### 3.4 Modo Palco (antes de subir ao palco)
Tela de leitura, grande, escura, para "olhada r"dd"; quando problemas iniciam:
```
   PATCH U14:2  ·  "Blues Riff"
   ● amp: à frente? Clássico Fonte  ·  reverb SHEL

   ┌────────────────────────────────────────────────────┐
   │  CTL 1 pressionado →  Assign 1: MFX liga           │
   │                       MFX: NOISE SUP. ( rate 3)    │
   │                       Chorus: já estava LIGADO     │
   │  Reverb: desligado.             Sobre: Jeff o exp  │
   ├──↳ Exp. pedal GK vol = sobre carga de PCM 1        │
   └────────────────────────────────────────────────────┘
   Status: 🟠 alteração NÃO SALVA — o pedal TOCA a cópia
   agora, mas se ligar	de novo e trocar slot, perde.      [gravar?]
```
- Não edita nada. Só declara acionamentos: o que muda no "estimado som".
- **Regra principal**: se a cópia de trabalho alterou algo, o Modo Palco mostra o aviso âmbar **"o pedal tocara a cópia que não está no slot"**.

---

## 4. Verdades do GR‑55 que a UI respeita

1. A edição ao vivo escreve no **buffer temporário** (`18 00 00 00`) — o app já faz isso; essa é a natureza real do aparelho, não decisão nossa.
2. Gravar no slot user é **lenta e transeuntes**: o aparelho fica surdo alguns segundos; a UI dá spinner + aviso "não pisar nos pedais até terminar".
3. Não há hierarquia de ciclos de interface: os pedais físicos (CTL 1, CTL 2, EXP/GK vol, selects de patch) fazem o que os **assigns do patch** mandam. Visualizar isso é tarefa de UI, não do pedal.
4. O modo GUITAR/BASS muda a face inteira da memória (270 vs 90 presets F%). O app nunca abre editor sem saber o modo.
5. Os 297 slots são U01:1–U99:3 (grupo–variação). Endereços reais, não abstrações.

---

## 5. Glossário de cópia (ui/copy) — único em todos os planos

- **"Cópia de trabalho"** em vez de "buffer temporário" (jargão do manual).
- **"Slot user"** em vez de "área de usuário".
- **"Gravar"** para write no slot; **"aplicar"** para write no buffer (som).
- **"Instrumento"** para o conjunto pessoa+guitarra+GK‑3, e **"Pedal"** para o GR‑55.
- Nunca se diz "global", "local", "MIDI address" na face do usuário.
