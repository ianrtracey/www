You are setting up a self-hosted Hermes Agent + Hermes WebUI on a VPS, reachable from my iPhone via Tailscale and the Hermex iOS app, with **Ramp Router** as the LLM provider. Do the work. Do not stop at a plan. Prefer official docs over memory.

## Sources (read these first)

Hermes / Hermex:

- Hermes Agent install: https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh
- Hermes providers: https://hermes-agent.nousresearch.com/docs/integrations/providers
- Hermes WebUI one-liner + per-device setup: https://get-hermes.ai/setup/
- Hermes WebUI repo: https://github.com/nesquena/hermes-webui
- WebUI remote access: https://github.com/nesquena/hermes-webui/blob/master/docs/remote-access.md
- Hermex official setup (Tailscale + iOS): https://hermexapp.com/setup
- Hermex README (Tailscale Serve vs 0.0.0.0): https://github.com/uzairansaruzi/hermex
- Hermex App Store: https://apps.apple.com/app/hermex/id6767006319
- Alternate iOS client (QR / Tailscale): https://github.com/hermes-webui/hermes-swift-ios

Ramp Router (custom section — required):

- Product: https://ramp.com/router
- Docs home: https://router.ramp.com/docs  (also https://docs.router.com)
- Overview: https://router.ramp.com/docs/getting-started/overview
- Quickstart: https://router.ramp.com/docs/getting-started/quickstart
- Connect your app: https://router.ramp.com/docs/getting-started/connect
- Endpoint + auth: https://router.ramp.com/docs/api/endpoint
- Request fields: https://router.ramp.com/docs/api/request-fields
- Cost-efficient / Flex routing: https://router.ramp.com/docs/optimizations/cost-efficient-routing
- Dashboard / API keys: https://app.router.com/keys
- Hermes first-class provider PR (may already be merged): https://github.com/NousResearch/hermes-agent/pull/93548

## Goal

End state:

1. Hermes Agent installed. **Ramp Router is the default provider** when `{{RAMP_ROUTER_API_KEY}}` is filled. A live model id from `GET /v1/models` is selected (never invented).
2. Hermes WebUI running as a persistent service on the VPS, healthy at `http://127.0.0.1:8787/health`.
3. Tailscale on the VPS, same tailnet as my phone.
4. WebUI reachable from my iPhone as `http://<tailscale-100.x-ip>:8787` (or a `https://…ts.net` Tailscale Serve URL).
5. Password persisted in the server `.env` (not only an inline env var).
6. Port 8787 is NOT open on the public internet.
7. You print a short "do this on your iPhone" card I can follow in Hermex.
8. You print a one-shot Router smoke test that succeeded (`pong` via `POST /v1/responses`).

## Where to install

Use **one** VPS. Prefer Hetzner if that placeholder is filled, else DigitalOcean, else ask me.

### Hetzner (preferred if filled)

- Provider: Hetzner Cloud
- Server name: `{{HETZNER_SERVER_NAME}}`
- Public IPv4: `{{HETZNER_IP}}`
- SSH user: `{{HETZNER_USER}}`   # usually root or a sudo user
- SSH key / identity: `{{HETZNER_SSH_IDENTITY}}`   # e.g. ~/.ssh/id_ed25519
- Datacenter: `{{HETZNER_LOCATION}}`   # e.g. ash, fsn1, nbg1, hel1
- Size: `{{HETZNER_TYPE}}`   # e.g. cpx31 / cax21
- OS: `{{HETZNER_OS}}`   # Ubuntu 24.04 preferred
- API token (only if you must create the box): `{{HETZNER_API_TOKEN}}`
- Project / account notes: `{{HETZNER_NOTES}}`

If `{{HETZNER_IP}}` is empty and `{{HETZNER_API_TOKEN}}` is set, create a small Ubuntu 24.04 VPS (4 vCPU / 8 GB is enough), attach my SSH key, and use that. If both are empty, skip Hetzner.

### DigitalOcean (fallback / alt)

- Provider: DigitalOcean
- Droplet name: `{{DO_DROPLET_NAME}}`
- Public IPv4: `{{DO_IP}}`
- SSH user: `{{DO_USER}}`   # usually root
- SSH key / identity: `{{DO_SSH_IDENTITY}}`
- Region: `{{DO_REGION}}`   # e.g. nyc1, nyc3
- Size: `{{DO_SIZE}}`   # e.g. s-2vcpu-4gb
- OS: `{{DO_OS}}`   # Ubuntu 24.04 preferred
- API token (only if you must create the droplet): `{{DO_API_TOKEN}}`
- Project notes: `{{DO_NOTES}}`

If `{{DO_IP}}` is empty and `{{DO_API_TOKEN}}` is set, create an Ubuntu 24.04 droplet in nyc1 and use that. If both are empty, skip DigitalOcean.

Do not create two servers. Do not expose 8787 in the cloud firewall / Hetzner firewall / DO cloud firewall. SSH (22) and Tailscale (UDP 41641 outbound is enough) only.

## Constraints

- Ubuntu 24.04, Python 3.11+, git.
- Do not curl | bash without reading the script first. Show me the script, then run it.
- Persist config in `~/.hermes/webui.env` or the WebUI `.env` so a reboot keeps host, port, and password.
- Default bind is localhost. For Tailscale, bind `HERMES_WEBUI_HOST=0.0.0.0` **or** use `tailscale serve --bg 8787` and leave the process on 127.0.0.1. Prefer Tailscale Serve + HTTPS (`https://…ts.net`) if MagicDNS / HTTPS certs are already on. Otherwise 0.0.0.0 + password + Tailscale IP is fine. Hermex allows plain HTTP only for Tailscale `100.64.0.0/10`.
- Set a strong `HERMES_WEBUI_PASSWORD`. Put the real password I give you, or generate one and print it once.
- Password: `{{HERMES_WEBUI_PASSWORD}}`
- **Ramp Router key (preferred LLM path):** `{{RAMP_ROUTER_API_KEY}}`
- **Ramp Router model id:** `{{RAMP_ROUTER_MODEL}}`   # leave blank → pick from GET /v1/models. Never invent or reuse a vendor public name.
- Fallback only if Router key is empty: LLM provider / model `{{HERMES_MODEL}}` and `{{LLM_API_KEY}}`
- Tailscale auth key (reusable/ephemeral tagged ok): `{{TAILSCALE_AUTHKEY}}`
- Tailnet name: `{{TAILSCALE_TAILNET}}`
- My iPhone is already, or will be, on this tailnet. Do not try to configure iOS yourself.

## Custom section: Ramp Router + Hermes

Ramp Router is Ramp's LLM gateway. One OpenAI Responses-compatible API in front of models from multiple providers (OpenAI, Anthropic, xAI, Fireworks, and others). The app holds a single Router key; Router holds the provider credentials. Free routing through 2026 (you still pay list price for tokens).

Canonical facts (do not invent others):

- Base URL: `https://api.router.com/v1`  (keep the `/v1`)
- Auth: `Authorization: Bearer $RAMP_ROUTER_API_KEY`  (or `X-Api-Key`)
- Routes to use: `GET /v1/models`, `POST /v1/responses` (buffered or `stream: true`)
- Compatibility: docs also mention `POST /v1/chat/completions` and Anthropic `POST /v1/messages`. Hermes' Router plugin uses the **Responses** surface (`codex_responses`) and treats `api.router.com` as Responses-only. Prefer Responses. If a Chat Completions call 404s, that is expected on some builds — switch to `/v1/responses`.
- Every request sends exactly one of `model` (one id) or `models` (ordered fallback list of 1–15 `provider:provider-model[:service-tier]` candidates). Never both.
- Model ids are **account-scoped**. Always take them from `GET /v1/models`. Do not hardcode `gpt-4o`, `claude-sonnet-4`, etc.
- Router-only request fields (via `extra_body`): `allow_flex_tier`, `provider_timeout`, `timeout_before_headers`, `metadata`. `allow_flex_tier: true` 400s on models without Flex — omit it unless you know the model supports it.
- Do not put OpenAI / Anthropic / other provider keys on this VPS for the main chat path. Router holds those.

### A. Create / confirm the key

If `{{RAMP_ROUTER_API_KEY}}` is still a placeholder, stop and ask me. I create keys at https://app.router.com/keys (secret shown once). Persist it on the VPS:

```
# ~/.hermes/.env
RAMP_ROUTER_API_KEY={{RAMP_ROUTER_API_KEY}}
```

Do not commit it. Do not print it after the first confirmation.

### B. Smoke-test Router from the VPS (before Hermes)

```bash
export RAMP_ROUTER_API_KEY='{{RAMP_ROUTER_API_KEY}}'

curl --fail-with-body \
  "https://api.router.com/v1/models" \
  -H "Authorization: Bearer $RAMP_ROUTER_API_KEY"
```

Pick a concrete `id` from `data[]`. If `{{RAMP_ROUTER_MODEL}}` is filled, use that only if it appears in the list. Then:

```bash
curl --fail-with-body \
  "https://api.router.com/v1/responses" \
  -H "Authorization: Bearer $RAMP_ROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: hermes-setup-001" \
  -d "{
    \"model\": \"<id-from-catalog>\",
    \"input\": \"Reply with exactly one word: pong.\",
    \"max_output_tokens\": 16
  }"
```

Expect an OpenAI Response object. Text lives in `output` / `output_text`. Log `x-request-id` and `x-trace-id` if it fails.

### C. Wire Hermes to Router (required)

Do this **after** Hermes Agent is installed, as the model step. Prefer the first-class provider; fall back to a named custom provider. Do not leave Hermes on OpenRouter / Nous / a leftover `{{HERMES_MODEL}}` if the Router key is set.

**Path 1 — first-class `router` provider** (in current Hermes if PR #93548 is merged, or after `hermes update`):

```bash
# key already in ~/.hermes/.env as RAMP_ROUTER_API_KEY
hermes model
# pick Ramp Router / router
# paste the key if prompted
# pick a model from the live catalog (or {{RAMP_ROUTER_MODEL}} if it is in that list)
```

Or non-interactive once the plugin exists:

```bash
RAMP_ROUTER_API_KEY='{{RAMP_ROUTER_API_KEY}}' \
  hermes -z "Reply with exactly one word: pong" \
  --provider router \
  -m "{{RAMP_ROUTER_MODEL}}"
```

Confirm `~/.hermes/config.yaml` looks like:

```yaml
model:
  provider: router
  default: "<id-from-catalog>"
```

**Path 2 — named custom provider** if `hermes model` has no Router entry:

`api.router.com` must use the Responses transport, not Chat Completions.

```yaml
# ~/.hermes/config.yaml
providers:
  ramp-router:
    api: https://api.router.com/v1
    key_env: RAMP_ROUTER_API_KEY
    transport: codex_responses   # Responses API. chat_completions will 404 on some Router builds.
    discover_models: true
model:
  provider: custom:ramp-router
  default: "<id-from-catalog>"
```

Then:

```bash
hermes model
# select the ramp-router named provider / Custom endpoint
# base URL: https://api.router.com/v1
# API key: from RAMP_ROUTER_API_KEY
# API mode / transport: Responses / codex_responses (NOT chat_completions)
# model: the catalog id
```

Mid-session switch later: `/model custom:ramp-router:<id>` or `/model router:<id>`. `/model` cannot add a provider — only `hermes model` can.

### D. Verify Hermes actually hits Router

```bash
hermes -z "Reply with exactly one word: pong"
```

Must return pong. If it 400s on `reasoning.effort`, the model does not accept that effort (Router validates per model). Drop reasoning or pick a reasoning model from the catalog. If it 401s, the key is wrong / deactivated / spend-capped.

### E. Optional: point Claude Code on my laptop at Router too

This is **not** required for the VPS / Hermex path. Only if I ask, or if you are already on this laptop and the key is present:

```bash
# read the script first, then:
curl -fsSL https://agents.ramp.com/install.sh | sh && \
  ramp router configure --api-key '{{RAMP_ROUTER_API_KEY}}'
```

That CLI points Claude Code / Codex at Router models and installs a status line with real Router cost. Re-run when models are added. Skip on the VPS unless I want it there.

## Steps to execute

### 1. VPS

- SSH in with the identity above.
- apt update, install git, curl, python3.11+, build essentials if the installer needs them.
- Create a non-root user if we are on root, unless I already have one.
- Enable unattended security updates.
- Confirm UFW (or equivalent): allow 22/tcp, deny 8787 from public. Tailscale will add its own interface.

### 2. Hermes Agent

```bash
# read first, then:
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.bashrc
```

Confirm `hermes` is on PATH. If bootstrap later cannot find the agent, point `HERMES_WEBUI_PYTHON` at the agent venv as in https://get-hermes.ai/setup/

Then run **Custom section C** (Ramp Router). Do not stop at a generic `hermes model` that points at OpenRouter.

### 3. Hermes WebUI

Preferred:

```bash
curl -fsSL https://get-hermes.ai/install.sh | bash
```

Or manual:

```bash
git clone https://github.com/nesquena/hermes-webui.git
cd hermes-webui
python3 bootstrap.py
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

Relaunch later with `./start.sh` or `./ctl.sh start`. Use `./ctl.sh status` and `./ctl.sh logs` to debug.

### 4. Password + bind

Write these into the WebUI env file so they survive restart:

```
HERMES_WEBUI_PASSWORD={{HERMES_WEBUI_PASSWORD}}
HERMES_WEBUI_HOST=0.0.0.0
HERMES_WEBUI_PORT=8787
```

If using Tailscale Serve instead, keep HOST=127.0.0.1 and run:

```bash
tailscale serve --bg 8787
tailscale serve status
```

Use the exact `https://…ts.net` URL Serve prints. Only add Serve if HTTPS port 443 at `/` is free.

### 5. Tailscale on the VPS

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --authkey={{TAILSCALE_AUTHKEY}} --ssh
tailscale ip -4
tailscale status
```

Record the `100.x` address.

### 6. Make it a service

systemd unit (or `./ctl.sh`) so WebUI comes back on reboot. After reboot, `/health` must still pass.

### 7. Verify from this machine (my laptop)

- `tailscale ping` the VPS.
- `curl http://<tailscale-ip>:8787/health` from my laptop if Tailscale is on it.
- Confirm `curl http://{{HETZNER_IP_OR_DO_IP}}:8787/health` **fails** from the public IP.

## What to print at the end

Give me a single recap:

- Which VPS (Hetzner vs DigitalOcean), IP, SSH command
- Tailscale IP and (if any) Serve URL
- WebUI local health URL
- The exact Server URL to type into Hermex
- Password reminder (once)
- systemd status
- Ramp Router: base URL, whether Path 1 or Path 2 was used, the exact model id from the catalog, and that the pong smoke test passed
- These iPhone steps, verbatim:

```
1. Install Tailscale on iPhone, sign into the same tailnet, wait until the VPS shows as connected.
2. Install Hermex (free): https://apps.apple.com/app/hermex/id6767006319
3. Server URL: http://<TAILSCALE_IP>:8787
   (or the https://…ts.net Serve URL if we used Serve)
4. Tap Test Connection. It hits /health.
5. Sign in with HERMES_WEBUI_PASSWORD.
6. Do not use 127.0.0.1 on the phone. That is the phone itself.
```

If Tailscale does not respond: both devices same tailnet and connected; server started with HOST=0.0.0.0 (or Serve); password is in `.env` not just the last shell.

If Hermes answers but not via Router: `~/.hermes/config.yaml` `model.provider` is not `router` / `custom:ramp-router`; rerun Custom section C.

## Do not

- Open 8787 on the public NIC or cloud firewall
- Use a Cloudflare quick tunnel unless I ask (URL changes every restart)
- Commit secrets
- Install Hermex via Xcode unless the App Store app cannot connect and we need the QR client
- Invent Router model ids or reuse raw OpenAI / Anthropic names
- Put provider API keys on the VPS when the Router key is set
- Point Hermes at Router with `transport: chat_completions` if `/v1/chat/completions` 404s

If a placeholder is still `{{LIKE_THIS}}`, stop and ask me to fill that one. Do not invent IPs, tokens, or passwords.
