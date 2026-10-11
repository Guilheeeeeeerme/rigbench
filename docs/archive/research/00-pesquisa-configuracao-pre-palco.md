# Pesquisa profunda — Configuração pré-palco do GR-55 e sincronização total

> **ARCHIVED research.** Hardware/SYSTEM facts remain useful; “what is missing”
> gap tables and Stage-as-root IA are stale. Live product:
> [AGENTS.md](../../../AGENTS.md), [docs/current/](../../current/).
> `research_notes/…/protocolo_midi.md` is not in this repo.
>
> Base desta rodada: Owner's Manual oficial GR‑55 (pages 69–74 e 70 via
> manualsdump.com), GR‑55 Training Guide oficial da Roland (`GR-55_Training_Guide.pdf`,
> extraído via busca), threads da VGuitarForums (patch delay, live use, tracking),
> o consenso do gr55-web-editor/2026 sobre biblioteca local e o protocolo já
> mapeado em `research_notes/Ecossistema de software GR55/protocolo_midi.md`.
> Este documento substitui a seção "Instrumento" genérica das fundações por
> uma **especificação real e completa do que o app precisa configurar antes do palco**.

---

## 1. A verdade oficial: o que é "SYSTEM" no GR-55 (o menu completo)

O manual (p. 69) define: *system settings = o que afeta o funcionamento do
pedal inteiro*. Menu `EDIT › SYSTEM`, com estes grupos — **esta é a lista-beça
do domínio Dispositivo do app**:

| Grupo | O que contém |
|---|---|
| **GK SETTING** | Os 10 conjuntos de captação (ver §2) |
| **OUTPUT SELECT** | Tipo de equipamento ligado na saída (amp) — a modelagem se ajusta por isso |
| **PEDAL/GK CTL** | Atribuições de pedal **idênticas para todos os patches** (p. 70: "operate identically regardless of the patch") |
| **MIDI/USB** | Canais, receber/notificar program change, USB audio |
| **OTHER › GUITAR OUT** | Fonte do jack GUITAR OUT: NORMAL PU / MODELING / BOTH (p. 70 e 80) — crítico para monitoração |
| **OTHER › TUNER / LCD / POWER** | Afinador, contraste, auto-power-off |
| **BACKUP / INIT** | BACKUP/RESTORE (USB memory), PEDAL CALIB (calibração do pedal EXP), FACTORY RESET, **GUITAR<->BASS** |

Grave: **BACKUP/RESTORE no pedal é um ritual de pendrive** — coísa que o app
substitui de forma superior (ler tudo e salvar `.syx`/bilbioteca local).

## 2. GK SET: o coração da configuração por instrumento (p. 69/74)

O manual: *"The GR-55 lets you create and store **ten sets of GK settings**
(GK set)... If you're using the GR‑55 with more than one guitar, you should
prepare and store GK sets for each guitar."* Cada GK set tem, oficialmente:

| Parâmetro | Opções (exatas, p. 74) |
|---|---|
| **GK SET SELECT** | 1–10 — também define o set usado quando o patch está "GK SET = SYSTEM" |
| **NAME** | 8 caracteres — *"nomeie cada GK set para identificar a guitarr / evitar selecion the errado ao trocar instrumento"* |
| **PU TYPE** | Guitarra: **GK‑3 · GK‑2A · PIEZO · PIEZO F (Fishman) · PIEZO G (Graph Tech) · PIEZO L (L.R. Baggs) · PIEZO R (RMC)**. Baixo: **GK‑3B · GK‑2B · PIEZO · PIEZO G · PIEZO R** |
| **SCALE** | Guitarra: 500–660 mm (ST 648, LP 628). Baixo: 710–940 mm (SHORT 760, MEDIUM 812, LONG 864, EXTRA LONG 914) |
| **GK PU POS** | Só baixo: 4STR‑1..3, 5STR Lo1/Lo2/Hi1/Hi2, 6STR |
| **PU PHASE** | NORMAL / INVERSE (se o grave sumir com a mistura do captador normal, inverta) |
| **SENS por corda** (Training Guide) | "ajuste para o meter chegar ao máximo **apenas** nas notas mais fortes" — hud ao vivo por corda |

**Ligação com os patches:** cada patch tem um parâmetro `GK SET` no MASTER (p. 58)
= SYSTEM ou 1–10. Ou seja: a "casa" de vocação pré-palco é dupla —
**system (10 GK sets) + referência por patch**.

**Insight da voz da comunidade** (VGuitarForums 3783): usuários usam os slots de
PIEZO como "memória" extra para sensitivity/EQ de cenas — os 10 sets são o
único lugar de calibração global do pedal, e a comunidade os trata como
"perfis de instrumento". É o app devendo uma UI que hoje está toda no LCD.

### —>: o wizard de instrumento do app deve ser, essencialmente, uma **GK Set editor**
- Perfil de instrumento (local, localStorage) = **promessa só de UI**;
- O gravação de verdade é **o GK set system** (nome, PU TYPE, SCALE, PHASE, SENS);
- Perfis locais gigantes: guarda comentário "U14:2 usa o violão Godin" — ligação perfil ↔ GK set ↔ patches.

## 3. Pedais e assigns: a regra das três camadas (resolver o "global vs patch")

Documento da comunidade (Roland GR55 Control assigns):
1. **SYSTEM › PEDAL/GK CTL** — same for ALL patches (global);
2. **Patch MASTER** — CTL/EXP settings per patch (que substitui o global );
3. **Assigns 1–8 por patch** — o veio fino por patched controller.

É essa três camadas com ACK em fonte local que o Palco deve explicar
(`fundações §3.4` Modo Palco "o que pisar CTL1 faz" precisa decidir de qual camada
vem a atribuição — o app já lê Master e Assigns; falta expor a camada system).

## 4. O fato crítico de palco: patch change tem GAP de silêncio

**VGuitarForums 8185**: *"Due to the **long patch delay (gap no sound)** during
each GR‑55 patch change, many users **plan ahead, use only one patch per song**
— e desenham cada patch com vários sons acessíveis apenas movendo o pedal EXP
ou pisando o pecto CTL — all within the same patch."*

**Consequência de IA**: o Modo Palco **não é uma lista de patches por música**;
é uma **cena por música**:
- 1 patch = 1 música (ou bloco de repertório);
- dentro dele, os "cortes" (verso/refrão/solo) são **assigns** (pedal pisado,
  pedal EXP, do português de palco);
- trocar patch a meio → gap de som, invisível ao aluno mas fatal ao show,
  e o app até pode **sugerir isto** num "aviso de palco" quando o setlist
  troca de patch demais.

## 5. Sincronização total: o que carregar e como mostrar progresso

### 5.1 O que carregar (inventario da memória utilizável)

| Objeto | Endereço/tamanho | Fonte |
|---|---|---|
| Patch atual (buffer) | RQ1 `18 00 00 00`, 6324 bytes de dados (7-bit) | `protocolo_midi.md` |
| 297 user slots | 2999 RQ1s idênticas (patch range user) | roldi (PatchMap) |
| System live | ~1,2 KB (FloorBoard refaz em blocos de 128 bytes; `systemState=1173` decodificado) | idem |
| System full dump | ~52 KB (52002 bytes; **inclui os 10 GK sets + MIDI/USB + OUT**) | idem (`GR-55_complete_system_dump.syx`) |
| Presets LEAD/RHYTHM/OTHER (270 guitarra / 90 bass) | só leitura — baixe quando o usuário filtrar por preset (bailável 360 RQ1s) | PatchMap 1.50 |

### 5.2 Restrições de protocolo que embutem o design de progresso

- **O GR‑55 não empurra nada sozinho** ("doesn't send sysx data unless a data
  request is sent") — tudo que o banco de patches mostra vem de poll.
- Pacing: gr55-remote usa bloqueios de 256 bytes com gap de 20 ms e timeout de 5 s
  de RQ1; FloorBoard usa 128 bytes com dormências de 50/150 ms — **números medidos
  na prática, não publicados**; o app deve fazer **benchmark adaptativo**: começa no
  pacing seguro e sobe até oscilar.
- **Escrita**: patch write deixa o pedal surdo alguns segundos, apaga CTL/EXP —
  nunca escrever durante setlist/palco.
- Toda progressão precisa ser **resumível** (pendrive de rede: usuário desligou o
  pedal no meio): guarda o que baixou (IndexedDB/OPFS), na próxima sessão sincroniza
  apenas o checksum diferente — a biblioteca local vira cache incremental.

### 5.3 Como mostrar progresso **constante e universal**

Barra global sempre visível (canto fixo) com 3 estados:

```
SINC ▓▓▓▓░░░░░░░░ U64:1 (64/297) · ~6 min restantes       [pausar]
PRONTO ✓ 297/297 · sistema lido 12:40 · cache 4h atrás
DIF  Δ 7 patches divergentes do cache            [sincronizar]
```

- **Estados**: SINC (por patch N/297 + ETA), PRONTO (selo com timestamp),
  DIF-DE(PATCH/EVENT)-apenas (o pedal mudou de novo; diff incremental).
- **Onde aplica**: todo card da Biblioteca mostra o selo "SINC"?  os slots com
  grandes divergência têm card realçado; Palco bloqueia export to `.syx` un-complete.
- O **progresso sobrevive à navegação** (rota/canvas), não é modal de página.

## 6. Checklist pré-palco (o wizard de Configuração, passo-a-passo)

Fluxo da casa: **Seleção do dispositivo → Conectar (Identity) → leitura system+moda
→ Wizard → Sincronia total → Palco (tela raiz)**.

```
1. 🎸 Modo do pedal            GUITAR / BASS (🔵, os bancos mudam)
2. 🔉 Saída:                   OUTPUT SELECT (amp? FOH?) + GUITAR OUT source
3. 🎯 Instrumentos conectados: para cada cavo: GK set associado e calibrado
                               PU TYPE / SCALE / PHASE / SENS por corda (live meter)
4. 🦶 Pedais:                  camada SYSTEM PEDAL/GK CTL revisada (global)
5. 📠 MIDIリ:                   PC RX SWITCH ON (se o teclado/programa troca patch)
6. 🛡 Backup antes de sair:    (a) .syx completa no app, (b) ritual pendrive se quiser
7. ⏳ Sincronizar tudo          297 slots + system → cache local → PRONTO
8. 🎭 Palco                     tela raiz: setlist + "cenas" por pedais dentro do patch
```

Regras do wizard:
- Cada passo correto é um ✅ somável; o app não deixa sair para o Palco com
  vermelho simultâneo sem "continuar assim mesmo".
- **Calibração SENS é interativa**: o app pede para o usuário tocar cada corda
  forte e mostra o meter ao vivo (existe no RQ1 do GK set, valor visível) —
  traduz o Training Guide oficial em guia paso-a-paso.
- Troca de GUITAR<->BASS re-sincroniza banco de presets (leitura read).

## 7. Facts para o Modo Palco (design por cima das fundações)

1. **Uma cena por música** — o palco deve suportar lista de "ordem do show"
   (setlist criada no app, enviada como sequência de program change quando o
   usuário pisar "avançar" — v. §4 gap).
2. **Camadas dentro do patch** (o "moço do patch": assign targets com nome +
   CONDITION min/max) desenham os cortes de palco — num "cena" ler do patch.
3. Editor and Biblioteca vam **filhos do Palco**, i.e. o arranque define "você já
   no palco": pressione EDIT para baixo (patrão arquitetura invertida pelo objetivo).
4. Sonor mute while switching: banner vermelho no palco em troca de patch
   ("pedal mudo ~1 s") — dados de RQ1 do buffer após read (0 som para patch change).

## 8. O que já está nosso/implementado vs o que falta (gap mapping)

| Recurso | Estado no Rigbench hoje | Falta para o palco |
|---|---|---|
| Identity + conectar | ✅ BrowserGate/DeviceScreen | — |
| Read/patch buffer edit | ✅ | — |
| Blooco patch (Library, chips) | ✅ | sincronização bulk + cache |
| Modo Palco (Stage.tsx) | ✅ v1 | setlist com cenas por pedal (§7) |
| Sistema: só GUITAR/BASS + backup name | ✅ backup .syx | **10 GK sets completos + MIDI/USB + OUTPUT SELECT + GUITAR OUT** (§2) — endereços no FloorBoard `System` (16 LSBs: `system 1`,`system 2`,`GK setup 1–10`) |
| per-patch GK SET (MASTER) | campo existe no mapa | exposto no wizard |
| ALT-TUNING per patch | campo existe | com aviso (comunidade: 1.50 fixou bug no guitar-to-MIDI; atual para com ALT-TUNING não intencional) |

---

## Conclusão da pesquisa

1. A configuração pré-palco **tem nome oficial: system settings + 10 GK sets**,
   o que muda a " tela Instrumento " genérica por uma **tela GK Set ATIVA** com
   lista dos 10 + wizard de calibração SENS ao vivo.
2. O que manda no palco **não é patch por música, mas camadas por pedal dentro
   de um patch** — porque o próprio pedal tem gap ao trocar de patch. O Palco
   deve mostrar **cena = patch + cortes por assigns**, não só uma lista de patches.
3. O carregamento total é possível (297 RQ1 + system), mas os números de pacing não
   são publicados; o design de **progresso constante universal** (3 estados: SINC/
   PRONTO/DIF, resumível, cache incremental, ETA por patch) cobre os riscos de
   protocolo e o usuário nunca fica sem saber onde está.

### Fontes
- Owner's Manual p. 69 (SYSTEM), p. 74 (GK SETTING + PU TYPE/SCALE/PHASE full),
  p. 70 (OUTPUT SELECT, PEDAL/GK CTL, MIDI/USB, GUITAR OUT) — manualsdump.com.
- GR-55 Training Guide (Roland, PDF via cdn.roland.com) — procedure SENS.
- VGuitarForums 8185 (patch delay → 1 patch por música), 3783 (GK piezo slots),
  3100 (tracking), 267126194 Scribd (optimal tracking).
- `research_notes/Ecossistema de software GR55/protocolo_midi.md` — endereços,
  pacing, escrita lenta e o dumper resumível (52 KB system dump do FloorBoard).
