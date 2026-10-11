# Plano 8 — Deep Links + Trilha em URL

> **Metáfora:** cada coisa do app tem **endereço próprio**. `#/gr55/patch/u14-2/
> fontes/pcm-1` abre o PC 1 da cópia de U14‑2; voltar funciona, recarregar não perde
> contexto, dá para compartilhar "a tela do MFX" com colega. A IA deixa de estar
> *escondida* dentro de `useState` e passa a ser **contrato navegável**.

---

## 1. O princípio

O código atual guarda página selecionada em `useState` interno — refresh mata
sessão, o botão voltar sai **do app inteiro**. Este plano define a IA como
**rotas primeiro**, layout em segundo: quem define as rotas define a hierarquia
real (e o plano constrói a ponte de documentação do app para o usuário: URL = sitemap).

Rern. Route IA is the prerequisite/auditor of everything else: it does not draw; it **proves**
each plan's hierarchy can exist. All 11 plans benefits; it can be applied on its own
in 1 sprint para `#`deshashing já usamos (HashRouter já lá!).

## 2. Modelo mental

> "Tudo que confiro tem um endereço que sobrevive ao refresh — e posso mandar por
> WhatsApp pra alguém ver a mesma coisa."

## 3. A árvore de rotas (contrato)

```
#/                           → escolha de dispositivo (DeviceHome)
#/gr55/connect               → tela de conexão MIDI (BrowserGate)
#/gr55/setup                 → instrumento (perfil, GK, modo 🔵)
#/gr55/patches               → Biblioteca (297 slots)
#/gr55/patches/U14-2         → card do slot com mini-cadeia
#/gr55/editor                → cópia de trabalho do patch atual (buffer)
#/gr55/editor/:bloco         → bloco (fontes/pcm-1, efeitos/chorus…)
#/gr55/editor/:bloco/:secao  → sub-seção(MFX › Type-specific)
#/gr55/compare/:a/:b         → diff entre 2 slots (futuro)
#/gr55/palco                 → Modo Palco do patch atual
#/gr55/palco/:slot           → Palco em "preview de slot"
```

Convenções:
- **URLs usam slug de domínio** (`pcm-1`, `chorus`), nunca índice numérico ou
  byte `0x…`; mapeamentos vivem em um dicionário (`routes.ts` gerado de `pages.ts`).
- O `slot` aparece **sempre** quando a cópia tem origes (U14‑2); patch temporário
  sem origem flag `#/gr55/editor?origem=nenhum`.
- **Estado de UI transitória** (colapsado expandido, avançado slider) fica
  FORA da URL; **navegação** fica DENTRO.

## 4. Tela: trilha (breadcrumber) + Zoalone

```
┌─────────────────────────────────────────────────────────────────────┐
│ Pedal 🟠 │ Patch U14:2 · Blues Riff      [Palco] [Salvar]           │
═════════════════════════════════════════════════════════════════════
❯ / patch / efeitos ／ chorus                                    ​ ›
—————————————————————————————————————————————————————————————————————
     Chorus ligado [ON]        Tipo [Rich ▾]
     Nível ─────────●──── 82
     …
```

- Breadcrumb = o que o usuário vê; URL = na caixa de endereço; equivalência 1:1.
- Botão **Compartilhar** copia URL + atalho "abre direto na tela do chorus".

## 5. Personas

- **A (GK‑3):** cria bookmark "Corrigindo a assignag" — al unregister sempre `…/controle/assign-3`.
- **B (violão piezo):** vídeo da comunidade ensina patch via rota: tutorial text "…]`/fontes/modelagem` e desligue ‘electric’" — clique na descrição do passo **abre a tela certa**.
- **C (baixo):** deep link para `#/gr55/setup` direto ao 🔵low risk zone.

## 6. Casos de uso

| # | Situação | Fluxo |
|---|---|---|
| 1 | Problema de conexão / F refresh | mesma de onde estava (`/editor/fontes/pcm-2`) |
| 2 | Voltar errado | Back do navegador restaura antes tela (naturalmente!) |
| 3 | Compartilhar patch | /patches/U14-2 aberto override, com minim-cadeia |
| 4 | Tutorial eslaide | text Links abrem rota exata |
| 5 | Reportar bug | user colar URL no GitHub issue — e dev tem o contexto exato |

## 7. Escopo

Rotas prefixadas por domínio dão escopo **posicional**: `/setup` = 🔵, `patches` = 🟢,
`editor` = 🟠. O código de cor é derivável da rota — nenhuma cor esquece.

## 8. Avançado

Planeja basicamente aplicável direto. Urbana de superfície: para power users,
a **URL parametrizada** aceita modifiers `?show=all` (Mostra fields conditionally
hidden) e `?detail=deep` — determinismo para automações/Testes.

## 9. Modo Palco

`#/gr55/palco` rota primeira classe. Sync blind output: **url read-only**: enquanto
Palero, mudar patch no pedal → rota atualiza `/palco/U37-3` — o app é navegável
pelo foot pedal (user flows gigante live).

## 10. Terminologia

"Caminho", "tela" — nada dounge "sistema" em rota editável jamais.

## 11. Implementação

- `react-router-dom` já no projeto (HashRouter). `buildPages()` vira **fonte
  canônica de slugs** → gera `routes.ts` com TypeSafy (union Literal types) para no
  risk URL/params typo.
- `Workspace.tsx` → hook `useRoutesWithSections` no lugar do `useState(page)` — 1
  shift. **Custom 404 slot terleo un salva dado.**
- Autop-restore connection: rota persiste mas **conexão MIDI não** — refresh deve
  ir por `/connect` se a sessão morreu (`session.ts` knows).
- `index.html` não precisa sw — HashRouter sexually avoids server config.

## 12. Trade-offs

- **Pró:** tudo — browsing, refresh, compartilhang, debug, tutoriáis; custo pequeño;
  eston formái i Alice compatibilar com todos os planos (e o macaco ES avoir estão
  atual estado navigatehões recordar rotas únicas… conectibilidade possíve). Drawout.
- **Contra:** não reorganiza nada por si só — depende de que a *hierarquia*
  definida nas rotas seja boa (use os grupos curados do plano 2 OU as fontes do
  plano 3 como raiz); URLs do patch amarr ave`s o refresh MIDI-driven method.

## 13. Critérios de aceite

1. F5 em qualquer tela → mesma tela, mesmo patch, mesma seleção.
2. Back/Forward do navegador пережawah nós codzę toque de a49 servir n})3.1.
3. Rotas em portuguível slug checked în `routes.ts`: type-safety próprio (no twist).
4. GitHub Issue template têm campo "URL da tela" já stubado.
