# GCP sandbox bootstrap — Ringbench

Actionable checklist to create an **isolated, pause-cheap** GCP sandbox for Ringbench SaaS experiments. Companion to [ringbench-saas-discovery.md](./ringbench-saas-discovery.md).

**Do not** deploy or spend from this doc alone. **Do not** attach workloads to Hostinger VPS `1959274`, Supabase `ferredemo`, or AWS `922839637382` for this experiment.

## Current GCP login state (2026-10-11)

| Item | Value |
| --- | --- |
| `gcloud` account | `guilhermesin2011@gmail.com` |
| Billing account | `011B34-DBC5BA-C0C4AC` (open) |
| Project `ringbench-sandbox` | **Not created yet** |
| Cursor gcloud MCP | Configured in user `~/.cursor/mcp.json` — may need IDE MCP reload; never commit |

Human must finish any Free Trial / card / ToS steps in the browser before automation continues.

## Target architecture (one GCP pane)

| Piece | GCP / adjacent service | Pause / idle |
| --- | --- | --- |
| API / web | Cloud Run | `min-instances=0` → ~US$0 compute |
| Auth | Identity Platform / Firebase Auth | Pay per MAU; ~US$0 in sandbox |
| Wallet DB | Firestore | Free tier; no idle VM |
| SQL | Cloud SQL | **Avoid** in sandbox — bills while idle |
| LLM | Vertex AI Gemini | Tokens only |
| Secrets | Secret Manager | Cents |
| DNS | Cloud DNS | Low fixed per zone |
| Domain | Cloud Domains and/or Registro.br → NS to Cloud DNS | Annual |
| Human email | Google Workspace (`contato@`) | Seat / month |
| Transactional email | Resend or SendGrid + SPF/DKIM in Cloud DNS | Per message |
| Invoice | Single GCP billing account | Budgets + alerts |

## Checklist (no spend until you choose)

### 0 — Google account

- [ ] Prefer a Google account you control for Ringbench (optional: dedicated vs personal).
- [ ] Confirm you can accept GCP Free Trial / billing ToS in a browser.

### 1 — Billing & budgets

- [ ] Free Trial if eligible: `https://console.cloud.google.com/freetrial` (~US$300 credit; card required).
- [ ] Link billing account `011B34-DBC5BA-C0C4AC` (or trial billing) only to the sandbox project.
- [ ] Create budget alerts at **50% / 90% / 100%** of a monthly ceiling (e.g. US$20).

### 2 — Project

- [ ] Create project **Ringbench Sandbox**.
- [ ] Suggested project ID: `ringbench-sandbox` (globally unique).
- [ ] Do not enable APIs on unrelated personal projects used for other demos.

### 3 — Enable APIs

```
run.googleapis.com
aiplatform.googleapis.com
secretmanager.googleapis.com
dns.googleapis.com
domains.googleapis.com
identitytoolkit.googleapis.com
firebase.googleapis.com
firestore.googleapis.com
artifactregistry.googleapis.com
cloudbilling.googleapis.com
```

### 4 — Domain & DNS

- [ ] Decide naming (Ringbench vs Rigbench) before purchase.
- [ ] `ringbench.com`: Cloud Domains if available, else registrar → nameservers → Cloud DNS.
- [ ] `ringbench.com.br`: Registro.br → NS → Cloud DNS.
- [ ] Zone records: map `www` / `app` / `api` to Cloud Run custom domains when ready.

### 5 — Email

- [ ] Workspace for human `contato@` / `suporte@` (optional early).
- [ ] Resend or SendGrid for transactional; publish SPF/DKIM/DMARC in Cloud DNS.
- [ ] Never send receipts via improvised SMTP on Cloud Run.

### 6 — Vertex Gemini

- [ ] Enable Vertex in the sandbox project; pick `gemini-*-flash` (and later Pro).
- [ ] Service account / ADC only — **no** API keys in the browser.
- [ ] Quota + billing alerts; token cost appears on the same invoice as Cloud Run.

### 7 — App + pause model

- [ ] Deploy API to Cloud Run with **min instances = 0**, low max for sandbox.
- [ ] Firestore for wallet / ledger documents.
- [ ] Secrets (Stripe, Resend) in Secret Manager — never in git.
- [ ] “Turn off”: set Run traffic to zero / delete service; keep budget alerts; DNS/domain may remain as the only fixed cost.

## Idle cost order of magnitude

| Item | Idle / month | Light use |
| --- | --- | --- |
| Cloud Run (min=0) | ~US$0 | Few dollars |
| Firestore free tier | ~US$0 | Free → cents |
| Vertex Gemini | US$0 | Tokens only |
| Cloud DNS (1 zone) | ~US$0.20 | Same |
| Domain `.com` | ~US$12/year | — |
| Workspace (optional) | ~US$6–12/user | Human inbox |
| Resend | Free tier | Per email |

## After login — handoff fields

When ready for scripted setup (still only with explicit approval to create resources):

1. Google email used for trial / billing
2. Project ID created (e.g. `ringbench-sandbox`)
3. Whether domains are purchased yet

Then: enable APIs, skeleton Cloud Run + Firestore + DNS zone, and budget alerts — **not** done by this documentation PR.

## Out of scope here

- Deploying Cloud Run services or spending GCP credit
- Changing Hostinger, Supabase, or AWS live resources
- Committing `mcp.json`, service account JSON, or API keys
