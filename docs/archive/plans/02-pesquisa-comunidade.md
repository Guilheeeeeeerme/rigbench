# Pesquisa de comunidade — o que os usuários aclamam e o que pedem (adendo)

> Fontes principais: reviews do **GR FloorBoard** no SourceForge (30 reviews, 4,9★),
> threads de wish list do **VGuitarForums** (2011–2025), o **gr55-web-editor** (2026) e
> seu roadmap completo, o **gr55-remote** (MIT, origem do nosso mapa), os fóruns do
> **Kemper Profiler** (Rig Manager vs Axe-Edit) e o material da Roland. O que a
> comunidade aclama e xinga é dado de design, não opinião.

---

## 1. O editor mais amado da história do GR-55 é uma réplica do painel

**GR FloorBoard** (GPL, Qt, gumtownbassman) acumula 4,9★ em 30 reviews, 244 downloads
por semana em 2026, e frases como:

> "Die Firma Roland soll sich ein Beispiel nehmen wie man Software betreut."
> (A Roland deveria aprender com esse cara como se cuida software.)

> "this GR-55 unit is 10 years old and with this software it comes todays gear…
> it is MAGIC."

Por que a comunidade aclama (padrões extraídos dos reviews e do readme 2017):

1. **"Graphical representation of the internal settings"** — a UI imita o painel
   físico do pedal. O usuário reconhece cada knob no lugar de sempre. Isto é, para
   guitarristas, *didática* = familiaridade, não hierarquia abstrata.
2. **100% do protocolo**: system, assigns, PEDAL/GK, MEMO, bulk write. Ninguém pergunta
   "onde está o parâmetro X" — tudo está.
3. **Bulk patch editing** — editar N patches de uma vez (a comunidade usa para "mudar o
   reverb de todos os patches do meu bank").
4. **Suporte vivo**: o autor responde reviews em dias; releases e pre-releases 2026.

**Implicação para o Rigbench**: a comunidade valida metáfora física (painel/rack)
como linguagem principal [→ reforça Plano de Cadeia de Sinal / painel], e valida
cobertura total + bulk edit como objetivo de fundo.

## 2. O desgosto com a Roland é sobre software, e a comunidade preencheu

- A Roland em 2026 entrega **apenas** Librarian (transfer/backup), driver e firmware
  1.50 (último update: 1.50 de 2012). O suporte oficial trata o Librarian como
  "transferência e backup de patches", nada mais.
- O editor nativo do pedal (menus LCD) é o pivô da frustração: 96 páginas de manual
  para navegar submenus.
- Consequência: **patch exchange é cultura**. VGuitarForums tem boards dedicados
  ("GR-55 Guitar Mode Patch Exchange"), existe guitarpatches.com, e packs vendidos
  (effectlibrary.com). Os patches **chegam prontos de terceiros** e o fluxo real é
  *baixar → inspecionar → adaptar → gravar no slot*.

**Implicação**: a Biblioteca não pode serchat; é a porta de entrada. Importar,
comparar com o que está nos slots, adaptar com segurança [→ Plano Biblioteca Primeira].

## 3. Threads da própria comunidade desenham o que está faltando

- **GR-55 Wish List** (desde 2011, revivido 2025): pedidos recorrentes de
  **edição por fonte** ("an equalizer in every source" — EQ separado para PCM1,
  PCM2, modeling e normal pickup), o que confirma que o usuário avançado pensa
  **em fontes de som simultâneas**, não em "páginas de parâmetros".
- **GR-55 — The Cool List** (antítese da wish list): usuários documentam
  "feature → como eu uso". O formato mostra o vocabulário deles: por música,
  por pedal pisado, por camada de timbre — nunca por endereço de menu.
- No repartido **gr55-remote** (MIT), usuários pediam **System settings** no app
  meses após o lançamento:,assigns + pedal/GK só não bastam.

## 4. O consenso moderno (gr55-web-editor, 2026) sobre fluxo de save

O roadmap completo do editor web mais recente confirma decisões que já pensávamos,
e adiciona duas:

1. **Quick Save sem diálogo** (Ctrl+S escreve buffer → slot atual, flash de
   sucesso/erro no botão) — a gravação lenta do pedal não pode exigir 3 modais.
   Aviso auxiliar: o pedal fica surdo alguns segundos depois do write.
2. **"Write to…" com slot picker de 297 slots, pesquisável, renomeando na gravação** —
   e badge no header mostrando de qual slot a cópia veio.
3. **Biblioteca local no navegador (OPFS)** que sobrevive a reload: import em massa
   dos 297, tags, notas, busca — "a memória do usuário mora no app, não só no pedal".
4. **Assign targets com NOME** (535 destinos, pesquisáveis) — nada de número cru.
5. **A/B Compare + diff + merge** entre dois patches — já mapeado como requisito
   avançado; a comunidade usa para entender *o que o patch do colega tem de diferente*.
6. **Setlist/performance mode** como fase 2 confirmada — ordenar patches por música.

## 5. A lição do Kemper: hardware bom, software reprovado

A comunidade Kemper compara Rig Manager e Axe-Edit há anos; veredito 2026 de um
thread longo: *"as we approach 2027 Rig Manager is still kind of 3rd rate software"*
— enquanto o **Axe-Edit** é tido como padrão-ouro de editor de hardware.

O que o Rig Manager faz que ninguém xinga: **Rig Exchange** com 20.000 perfis de
graça, "test driving a Rig from a fellow user is just a single click away", tagging,
e montagem de Performances por drag-and-drop.

**Implicação**: editor de hardware é julgado como produto de software por si só.
O padrão aclamado: **preview + test-drive de 1 clique dos patches da comunidade**
(nosso `.syx` já permite isso), e montagem de setlist arrastando, não editando.

## 6. Frus-trações de conexão (menos glamouso, muito recorrente)

Threads de suporte do FloorBoard vivem de "Device is not a Roland GR-55", seleção
de porta MIDI, driver do Windows. Nosso BrowserGate já cobre a maior parte; a lição
é que a tela de conexão precisa **dizer claramente qual porta é o pedal e
confirmar com identidade** (Identity Request) em vez de deixar o usuário adivinhar.

## 7. Síntese: o que a pesquisa muda nos 10 planos

| Achado de comunidade | Reforça / ajusta |
|---|---|
| FloorBoard aclamado com metáfora de painel físico | **Cadeia de Sinal** ganha variante "painel/rack"; familiaridade vira critério |
| Patches chegam de terceiros (exchange, guitarpatches) | **Biblioteca Primeira** sobe de plano a "porta de entrada"; import `.syx` com preview |
| EQ/pensamento por fonte simultânea (wish list 2011–2025) | IA por **fontes** (PCM1, PCM2, Modeling, Captador) como grupo de topo, não como 15 abas planas |
| Quick Save + slot picker + OPFS do editor web 2026 | **Modelo Documento** e **Escrita em Estágios**: save rápido de 1 clique com flash; confirmação só quando destrutivo |
| "Rig Manager 3rd rate" veredito da comunidade | Qualquer plano precisa de Biblioteca forte com test-drive (não abandonar plano pelo editor ser bom) |
| Setlist mode confirmado como demanda | **Modo Palco** (fundações) ganha setlist ordenável por música |
| Numa paixão: usuário novo se perde; avançado quer 100% | **Essencial/Avançado** para nível, e sempre com "100%" acessível, nunca escondido atrás de parede |

### Possível 11º plano (novo, nasce da pesquisa)
**Plano Painel Físico (estilo FloorBoard aclamado)** — réplica fiel do layout do
GR-55 (o painel LCD segunda-tela ao vivo), com knobs/LEDs no lugar de sempre e
1:1 com o manual. É o plano de menor risco cultural: quem já conhece o pedal,
reconhece. Eu o trato como variante forte do plano "Cadeia de Sinal": cadeia de
sinal para o raciocínio, painel para a edição ponto-a-ponto.

---

Fontes consultadas nesta rodada: SourceForge GR FloorBoard (reviews, discussion,
feature requests), GitHub jameadows/gr55-web-editor (README + roadmap completo),
GitHub motiz88/gr55-remote, Roland support (Librarian, firmware 1.50, artist
patches), kemper-amps.com, forum.kemper-amps.com (Rig Manager vs Axe-Edit),
vguitarforums (via índice de buscas; acesso direto bloqueado 403) e
guitarpatches.com. Notas anteriores do repo (`research_notes/`) continuam
canônicas para protocolo e licenças.
