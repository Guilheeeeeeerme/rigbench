# Ringbench SaaS discovery

Research conclusions for a **metered AI SaaS** (working name **Ringbench**) with wallet, auto-top-up, and dynamic margin pricing. Snapshot date: **2026-10-11**.

This document is **non-authoritative** for the Rigbench Web MIDI product IA. Rigbench today stays a static client; **Maestro** remains the in-app AI copilot name (BYOK Gemini in the browser). See [AGENTS.md](../../AGENTS.md).

## Product split

| Layer | What it is today / proposed |
| --- | --- |
| **Rigbench** (shipped) | Static React + Vite + Web MIDI SysEx to Roland GR-55. No backend. Maestro = BYOK Gemini in browser. |
| **Ringbench** (discovery) | Metered cloud AI: server-side models, wallet ledger, Stripe (and optionally Mercado Pago), paywall / trial. |

**Open:** Ringbench as Rigbench rebrand vs paid cloud layer vs separate product — decide before buying domains.

## Live inventory (do not reuse for this sandbox)

| Asset | Status | Detail |
| --- | --- | --- |
| Hostinger VPS | In use elsewhere | KVM2 id `1959274`, Ubuntu 24.04, 8 GB, `82.25.74.147` — **do not** host Ringbench sandbox here |
| Supabase | In use elsewhere | Project `ferredemo` (`zgoscslzyizwnzqoyqul`), eu-west-1, ACTIVE — **do not** mix wallets/auth here |
| AWS | Empty | Account `922839637382` — no Lambda/S3/ALB; Gemini is **not** native AWS billing |
| Domains | Partial | `ferredemo.dev` owned; `ringbench.com` / `.com.br` **not** owned yet |
| GCP | Ready to sandbox | `gcloud` as `guilhermesin2011@gmail.com`; billing `011B34-DBC5BA-C0C4AC` open; **no** `ringbench-sandbox` project yet |
| Cursor MCP | Configured | `~/.cursor/mcp.json` has `@google-cloud/gcloud-mcp` (user may need MCP reload) — **never commit** this file |

## Recommendation — GCP all-in sandbox

**Prefer one GCP project** so infra and Gemini share one billing account, with pause-cheap idle cost.

| Piece | Service | Idle / pause |
| --- | --- | --- |
| API / web | Cloud Run (`min instances = 0`) | ~US$0 compute when idle |
| Auth | Identity Platform / Firebase Auth | Near-zero MAU in sandbox |
| Wallet / ledger | Firestore | Free tier; no always-on VM |
| LLM | Vertex AI Gemini | Pay per token only |
| Secrets | Secret Manager | Cents |
| DNS | Cloud DNS (+ Domains or external registrar) | Low fixed zone cost |
| Human mail | Google Workspace (`contato@`) | Monthly seat |
| Transactional mail | Resend or SendGrid + SPF/DKIM in Cloud DNS | Per send |

**Avoid for this sandbox:** Cloud SQL (charges while paused), Hostinger/Supabase current stacks, AWS day-1 for Gemini+infra alignment.

Bootstrap checklist: [gcp-sandbox-bootstrap.md](./gcp-sandbox-bootstrap.md).

### Alternatives considered (superseded for this experiment)

| Option | Why considered | Why not chosen now |
| --- | --- | --- |
| Hostinger VPS Docker only | Already paid | Mixing with other workloads; ops burden; Gemini billing separate |
| VPS + Supabase hybrid | Auth/DB managed | Reuses live `ferredemo`; splits Gemini billing |
| AWS serverless | Empty account | Gemini not on AWS bill; colder start cost story |
| Railway / Render | Nice pause UX | User pivoted to GCP for Vertex + single invoice |

## Domains & email

**Recommendation**

1. Buy `ringbench.com` (global) and `ringbench.com.br` (Registro.br) only after naming is settled.
2. Point NS to **Cloud DNS** (or Cloudflare if you prefer proxy; discovery default is GCP DNS for one pane).
3. Human inbox: Workspace `contato@` / `suporte@`.
4. Transactional (verify, receipts, card failure): **Resend** (default) or SendGrid; SPF/DKIM/DMARC in Cloud DNS. Do not use Hostinger Mail for app webhooks.

Regional UX: `.com.br` → pt-BR; `.com` → detect with PT/EN toggle (same bilingual approach as Rigbench).

## Models & keys

| Approach | Fit |
| --- | --- |
| **Vertex AI Gemini (server)** | **Preferred** for SaaS — same GCP billing, no browser keys |
| DeepSeek Flash | Cheaper tokens, but browser BYOK/CORS/jurisdiction issues — only if later as **server-side** dual route |
| Browser BYOK (current Maestro) | Keep on local Rigbench; **never** put provider master keys in the client for Ringbench |

Meter every call: log input / output / cache tokens **before** wallet settle. Budgets + alerts on the GCP billing account.

## Auth, demo, anti-abuse

**Recommendation:** Identity Platform / Firebase Auth (Google + email first; phone later if needed).

| Concern | Approach |
| --- | --- |
| Demo / friends | Role `demo_sandbox` with fictional wallet (no provider spend) |
| Caps | Daily token budget, per-IP / device fingerprint, no auto-top-up, no Pro/deep routes |
| Invites | Optional single-use codes; **per-user** demo accounts, never shared passwords |
| RLS / rules | Ledger readable only by owner; server writes via Admin / Cloud Run SA |

## Payments & auto-top-up

| Gateway | Pix | Apple / Google Pay | Auto-top-up | Note |
| --- | --- | --- | --- | --- |
| **Stripe BR** (primary) | 1.19% (invite-gated) | Card rates (~3.99% + R$0.39) | PaymentMethods + off-session | Best wallets + cards |
| Mercado Pago (backup) | Strong native | BR wallet / card | Cards + subscriptions | If Stripe Pix invite blocks launch |
| Asaas | Native | Weaker vs Stripe | Boleto/Pix focus | SMB BR; weaker Apple Pay |

**Recommendation**

- Stripe primary for Apple/Google Pay + saved card + auto-top-up.
- Prefer **Pix** for manual top-ups (lower fee) when available.
- Mercado Pago only if Stripe Pix is blocked.
- Flow: user sets `min_balance` + `topup_amount` → on debit if balance &lt; min → off-session PaymentIntent → webhook credits ledger; failures email via Resend and disable auto-top-up after N failures.
- Idempotency on `(user_id, reason, request_id)`. Pattern: **hold → settle**; never call LLM without a wallet hold covering the route ceiling.

Not legal/tax advice; IOF may apply on cross-border flows.

## Dynamic pricing

Planning assumptions (refresh before go-live):

- Margin: **40%**
- FX: **5.5 BRL/USD** (planning only)
- Gateway fee: card **3.99%** or Pix **1.19%** depending on top-up method used to fund the wallet

**Formula**

```
API_cost     = (in_tokens/1e6)×P_in + (out_tokens/1e6)×P_out  (+ cache tiers)
Target       = API_cost × (1 + margin)
Wallet_debit = Target / (1 − gateway_fee)
```

Gross-up so net after gateway still covers API + margin.

### Example debits (planning)

| Scenario | Tokens in/out | API (BRL) | Margin 40% | Gateway fee | Wallet debit |
| --- | --- | --- | --- | --- | --- |
| Short reply (Flash off-peak, card) | 2 000 / 400 | 0.0030 | 0.0012 | ~0.0002 | ~0.0043 |
| Long reasoning (Flash peak, card) | 8 000 / 3 000 | 0.0330 | 0.0132 | ~0.0019 | ~0.0481 |
| Long history + Pro (off-peak, Pix) | 40 000 / 2 500 | 0.1724 | 0.0690 | ~0.0029 | ~0.2443 |

List rates used for planning (verify at launch): DeepSeek Flash off-peak/peak and Pro bands; Gemini Flash/Pro vary by generation. Ledger in **BRL micros**. Refuse start if hold &lt; estimated ceiling for the route.

## Paywall & trial

| Feature | Trial / low balance | Funded wallet |
| --- | --- | --- |
| Flash models | Yes, daily cap | Yes |
| Pro / deep reasoning | Locked | Unlocked above threshold |
| Long context / attachments | Hard token ceiling | Higher ceiling |
| Tools / web search | Off | Optional add-on cost |
| Auto-top-up | Off | User opt-in |
| Demo sandbox | Fictional balance | N/A |

**Recommendation:** Tiny welcome credit (e.g. R$3–5 from margin budget) + Flash-only; Pro gated; org spend kill switch; shared device/IP quotas for trial abuse.

## Phased plan (GCP-shaped)

| Phase | Focus | Exit criteria |
| --- | --- | --- |
| 1 | Naming decision; domains; Cloud DNS; Resend DNS; GCP project + budgets | Staging hostname + TLS; budget alerts live |
| 2 | Identity Platform + Firestore wallet ledger + Cloud Run skeleton | Login + balance document |
| 3 | Vertex Gemini Flash proxy + metering + debit formula | Dry run: hold → generate → settle on fake wallet |
| 4 | Stripe Checkout + saved card + auto-top-up webhooks + receipts | Test-mode top-up → credit → chat debit |
| 5 | Demo role, rate limits, spend caps, Pix path (Stripe or MP) | Abuse tests pass; soft launch friends |

## Open questions

1. Ringbench = rebrand of Rigbench, paid cloud layer, or new product?
2. Primary market: Brasil (Pix-first) or global (Apple/Google Pay-first)?
3. Fixed 40% margin or per-model-route margin?
4. Phone/SMS on day 1 or Google + email only?
5. Keep Maestro BYOK on local Rigbench forever while selling cloud separately?
6. Monthly incremental budget ceiling in BRL beyond free credits?

## Sources

Hostinger / Supabase / AWS inventory from live MCP/CLI checks (2026-10-11); DeepSeek and Stripe BR public pricing snapshots; discovery canvases under the local Cursor project (not in repo). This PR documents conclusions only — **no** GCP resources were created.
