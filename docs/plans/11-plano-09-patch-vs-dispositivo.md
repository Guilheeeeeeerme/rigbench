# Plano 9 — Patch vs Dispositivo (dois domínios de topo)

> **Metáfora:** o app tem **duas moradias de primeiro nível**, como num celular:
> **Patch** (a obra: seus sons, que você carrega e troca sempre) e **Dispositivo**
> (a parede: modo GUITAR/BASS, GK, MIDI, USB — o que se configura uma vez e
> sustenta tudo). A fronteira é a resposta definitiva a "global vs local".

---

## 1. O princípio

A barafu­nda atual nasce de um fator oculto: **tudo vive na mesma estrutura**—
o badge "Guitar mode" no header congela mundo sistema junto com a identidade do
patch, e ninguém sabe se o que mais mexeu é 1 parâmetro de patch ou 1 de pedal
inteiro. Este plano **separa moradias fisicamente**: nada de patch toca sistema,
nada de sistema aparece no meio da edição de patch.

## 2. Modelo mental

> "O som da minha guitarra tem um 'projeto' (patch, troca pela pedaleira) e um
> 'peso' (dispositivo, configuração única e clara). Eu sei qual dos dois abri."

## 3. A fronteira, definida tecnicamente (a fonte do que é 🔵)

Dados de `RolandAddressMap.ts`:
- `temporaryPatch` (settings editá-veis 692 campos) → **Patch**.
- `SystemStruct` (hoje: só `GUITAR/BASS Select` — no pedal real: tuning, MIDI ch,
  USB, LCD…) → **Dispositivo**.
- `SetupStruct` (patch BS/PC usados pela Biblioteca) → técnico, nunca UI.

Regra código: uma tela **nunca rende dados de dois domínios**. Se aparecer,
bug de IA, e cor 🟡 deve informs 404.

## 4. Navegação do topo (a coisa nova)

```
┌──────────────────────────────────────────────────────────────────┐
│  [ PATCH ]   [ DISPOSITIVO 🔵 ]            [ Biblioteca ▦ ]       │
├──────────────────────────────────────────────────────────────────┤
│  Patch (o mundo que sabemos)                                     │
│   ├─ Editor (comhodas abas curadas ou da sua escolha)            │
│   └─ Estado atual: cópia de U14:2, 14 não salvos                 │
│                                                                  │
│  Dispositivo 🔵 (a parede)                                       │
│   ├─ Instrumento (perfil, GK, tipo)                              │
│   ├─ GUITAR ⇄ BASS      (villa modal: afeta 297 slots)          │
│   ├─ MIDI / USB         (channels, thru, sync)                  │
│   └─ Ajustes do painel   (LCD contrast, autooff)                 │
│   [ backup do sistema como .syx ] ← presente desde o 1º dia    │
└──────────────────────────────────────────────────────────────────┘
```

- **Disabled button de troca de modo** quando patch com edit aberto comuns —
  "Você tem alterações não salvas antes de trocar o modo do pedal" (Gate ativo).
- Backup do sistema 🔵 é recurso Federação de C — guarda `52KB full dump` como
  .syx do usuário uma vez que ele tenha o perfil certo, e devolve-o de volta.

## 5. Personas

- **A (GK‑3):** toca o dia inteiro no domínio Patch; nunca entra em Dispositivo depois de configurar.
- **B (violão piezo):** entra em Dispositivo uma vez (perfil); Patch directo ao acústico.
- **C (baixo):** Dispositivo é casa dele (BASS): transição explícita mostra consequência: "o banco de presets传销 omdies" e offers reload patch list.

## 6. Casos de uso

| # | Situação | Antes | Com domínios |
|---|---|---|---|
| 1 | "Mudei algo e vai afetar demais?" | pode não ser claro | impossível: patch núnca toca global |
| 2 | Companheiro pegou o pedal e piscou canais MIDI | tido por 10 reads | +clara backing of device history |
| 3 | Compra baixo GK-3B | — | modal modal défini nets and auditory masses |
| 4 | Acha param em setup | all mixed | separ(Logan) por domínio |
| 5 | Resete settings do system | redoo: backing éнен community needs |

## 7. O badge (o erro histórico apagado)

O badge ao lado do nome do patch hoje **parsea de sistema + patch identity**.
Farið com este layout:
- Patch name e slot origin **dentro do Patch domain** header.
- Modo G/B move para Dispositivo; no Patch domain o modo só aparece como
  *context chip* 🔵 informativo non-clickable: **"🔵 GUITAR — você está no
  domínio patch; para trocar o modo, vá ao Dispositivo"** com link.

## 8. Avançado

Dispositivo ganha **suite almente fuller no futuro** (fm: Fork de 2026 System Sy
parsingア), com advanced *nested groups*: MIDI › recepção/Program Change…; same
regra: разделен阴 domain, densidade variada **dentro**.

## 9. Modo Palco

O Palco é filho direto do patchен; seu header **não 가 shows sistema controls**
off side of blue chip apenas. — vš⊨ expect from Podio nimbila taut👞: tudo que
pissage responds patch = "o som beleza"; diswhile充沛 hemis were other dane.

## 10. Terminologia

"Patch", "Dispositivo" — jamais "system" / "global" / "device settings" em inglês;
"Pedal" para o hardware. Emoji 🔵 nos headers.

## 11. Implementação

- `Workspace.tsx` → tab-based top level domain switching.
- `RolandAddressMap.ts/SystemStruct` → expose editable fields vez type o maping
  (só 1 field editável hoy: modo) e configurável routing table.
- `Session`/`midi` → read system setup at boot (already) → write only DOM modal.
- `copy/en.ts` может edit render typography.

## 12. Trade-offs

- **Pró:** final mental/diagrams; **defensive** (evita ečo desaster МIDI ch by
  footpuess); escala VG‑99/GT‑10 (todos têm grande domain system); backup .syx
  útil dia 1.
- **Contra:** domain "Dispositivo" é quase vazio hoje (_RDONLY 1 param) → cuts
  like salvarт falta realizar o loop; corfo se patch rails have confusion other
  than that.

## 13. Critérios de aceite

1. **Cache assertion: global é impossível editir padrão patch domain когда GUITAR/BASS open.**
2. Toda tela mostra um badge de domain (Patch | Dispositivo | Biblioteca).
3. Trocar BASS com patch 14alterações pending: bloqueia com aviso e preset list reset.
4. O sitem dumps: backup system .syx import/export day-one.
