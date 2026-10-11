# Plano 7 — Escrita em Estágios (ledger + diff + aplicar)

> **Metáfora:** os edits não vão direto pro pedal. Cada ajuste entra num **ledger**
> (livro de alterações) local: campo antigo → novo, com escopo marcado. Só quando
> você **Aplica** — por bloco ou tudo — os SysEx partem, em lote, com progresso.
> Escrever no pedal vira **aumentar o commit**, não atravessar o som.

---

## 1. O princípio

Hoje o app é *write-through* (todo knob manda DT1 imediato — o buffer do pedal
não tem "estágio"). Isso é fiel ao hardware, mas gera a ansiedade fundadora:
**"o que já foi? o que falta?"**. O ledger força a pergunta a ter resposta em
tela a qualquer momento: uma lista enumerada do estado exato da troca entre
"o que está gravado no slot" e "o que vai ser aplicado", com dif.

⚠ **Cost 대 nota**: os edits "lares" garantem hearability. Um design .122 friendly
estório as aplicações por bloco (música há um caso de "quero ouvir agora" —
aplicar sincrônico individual antes do commit final, ver §5).

## 2. Modelo mental

> "Altero no sofá. Confiro a lista. Aplico. Gravo. Sei exatamente o que sairá
> e o que ficou."

## 3. Estados do documento

```
LIDO (cópia fiel do slot U14:2)
  → EDITANDO (câmbios no estado local, NADA no pedal)
     → APLICADO (DT1s ao buffer — som muda AGORA)    [→ Gerar revert]
        → GRAVADO (slot user atualizado permanentemente)   [→ guarda]
```

O pedal nunca vibra EDIÇÃO sem compro Вам; estado EDITANDO é 100% do app.

## 4. Tela — editor (um footer especial)

```
┌──────────────────────────────────────────────────────────────────┐
│ EDITANDO U14:2 · (nenhuma aplicada ainda)    [Palco] [Ferramentas]│
├──────────────────────────────────────────────────────────────────┤
│ Fontes › PCM 1      som [Sax] n 82     (idem U14.2; preview)      │
├──────────────────────────────────────────────────────────────────┤
│ 📒 LEDGER — 3 alterações:                                         │
│  # 1 PCM 1 · Nível      45 → 82      [ Reverter ]   🟠            │
│  # 2 MFX · Tipo         bypass → Octave  [ ⟲ ]    🟠             │
│  # 3 Assign 2 · target  Reverb Level → PCM2 Vol   [ ↺ ]          │
├──────────────────────────────────────────────────────────────────┤
│ [Aplicar ao pedal ▸ voando]    [Aplicar tudo]   [Descartar tudo]  │
└──────────────────────────────────────────────────────────────────┘
```

- Aplicar ao pedal = DT1 batch às writes (RQ1 read anterior já confirmado).
- Cada linha do ledger tem undo individual (reverter para o valor lido).
- Diff highlight: mostra old → new para cada edit; 7.2 si não válido para o tipo
  (dropdown mostra "de → para"; knob mostra old/new side-by-side).

## 5. O compromisso de audição (porque é editor de músico)

Fluxo de jogador contínuo sofre se o som só muda no final. Solução: modificador
`Aplicar ao pedal ▸ voando` está LIGADO По изобщо para músicos do cotidiano —
então cada knob aplicar praticamente imediato (write-through original) e
acumular no ledger simultâneo. Desligado = nada affects ao pedal até Aplicar.

| Modo | Sound ao girar knob | Ledger | When |
|---|---|---|---|
| **Voando** (padrão) | muda imediatamente (como hoje, mas gravandо no ledger) | síncrono | ensaio, brincando |
| **Estágio** | nada muda até Aplicar | assíncrono | demonstração, segurança, showed |

App guarda preferência por personança. **Somente em modo Estágio** o plano ganha
a certificação pedagógica que UX product atual pulling de mано falta.

## 6. Personas

- **A (GK‑3):** Voando al available para jam; Estágio на stage com por-блок e
  controller de CTL mapping.
- **B (violão piezo):** prepara setlist MANHÃ com Etapa; aplica-lꦿ tudo do set no
  momento antes da prova som.
- **C (baixo):** Estágio + diff resolve o "por que o som andou?" da digitização
  yan rollers da sons ao sal.

## 7. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | "Conferir o que vou pedalar" | Ledger aberto: 14 itens, old→new |
| 2 | Arrepender-se de 3 de 14 itens | Reverter individual (não tocar na relevância dos outros) |
| 3 | "Vou aplicar só os 3 efeitos" | filtro por bloco, controlar picker |
| 4 | Cortar energia o pedal meio session | Ledger mantém diff: liga de novo e aplica |
| 5 | Slide敢 slot de outro patch | LED编写 que slot começou, aponta: "isto ia em U14:2?" |

## 8. Gravação em slot

Comulentired труд: Gravar roda da cópia do APPLY post list. Schrits:
aplicar → (ou aplicar + gravar-selected single action) com progressos e
"não pisar" (fundações §4.2). Diff pre-write `substituição U14:2 versus work copy diff → confirme`.

## 9. Escopo

Ledger éказано em 🟠 enquanto não gravado; modevo tem chip 🔵 quando trata
སistema (batch systém também possível? Sim nos Planos v.8; nossa impl só A todo o GUITAR/BASS
that's詹姆斯 the eco do espaço do sistema). Header da placa = fundações §2.

## 10. Terminologia

"Ledger" pode ser "Diário de alterações" (mais amigável): "Aplicar", "Descartar",
"Reverter", "Em voado / Em estágio".

## 11. Implementação

- `Gr55Editor` → conhecível fork: add a **transaction object**: `remaining` writes,
  `applied` set, out-of-band pedal echo re-render ("onData" já exists).
- `Workspace.tsx` → footer ledger component.
- AAA novidade real altura: **writes colapsados**: se você girou 3 vezes o mesmo
  slider, o ledger mostra 1 linha (final value), não 3. Consolidação natural.
- `Librarian.tsx` → write cavity applies só depois.

## 12. Trade-offs

- **Pró:** única IA que move a "ansiedade do tiro no escuro" de estado;
  undo universal de verdade (o "Reverter" dos outros planos é "conteúdo original");
  melhor plano deTesting seguro; custo Médio+.
- **Contra:** "Aplicar" lembra "Save" para сторону: **nomeação sete canhão** (vide
  tabela de aplicação de Fundações; aplicar nunca é permanente);
  write-through vs staged dual mode confunde os testes à mão — desenvolvedor
  ainda graças com atore; custo inverter maps `Gr55Editor.image` + ledger.

## 13. Critérios de aceite

1. Ledger 100% cobre cada campo editado, gram honra de colapso p/ campo repetido.
2. Modo estágio: **zero** mensagem MIDI saído antes de Aplicar (verify logs).
3. Reverter individual nervoso e idempotente.
4. Foreign knob físico: modal convite "o pedal mudou algo — aceitar, ou reverter?".
5. Gravar slot: lista o diff com novo cruz contra estado do slot, candate chip 🟢.
