# Secure video relay (Cloudflare Worker)

This relay keeps provider credentials server-side. It is a technical scaffold, **not deployed** and does not trigger video generation until configured.

## Required setup
1. Create a Cloudflare Worker and deploy `worker.js`.
2. Set encrypted secrets in Worker settings:
   - `FAL_KEY`: provider API key.
   - `ARTFORGE_ACCESS_TOKEN`: a long random token that ArtForge will use to authenticate.
3. Set the Worker variable `FAL_VIDEO_ENDPOINT` to a supported fal queue endpoint/model path.
4. Test GET `/health` (configuration status only).
5. Submit only a short test clip after verifying the selected model endpoint's payload schema and pricing.

## API
- `GET /health`: configuration status.
- `POST /submit`: bearer-authenticated request with `prompt`, `duration` (5, 8, or 10), and `aspect_ratio` (9:16, 16:9, 1:1).

## Safety
- Do not commit keys or access tokens.
- Worker only accepts prompt/duration/ratio and caps duration to 10 seconds.
- Endpoint/model path is controlled by Worker configuration, not the browser.
- CORS is permissive in this scaffold; tighten `Access-Control-Allow-Origin` to the ArtForge site URL before production.
- Validate payload schema against the exact fal model endpoint before testing; different models use different parameter names and may not support duration/aspect ratio exactly as shown.
- Add rate limiting, account authorization, and a stricter budget/usage guard before public use.
- fal is pay-per-output and this relay does not verify a free-credit balance. Never assume usage is free.

## Configure secrets
Use Cloudflare dashboard > Workers & Pages > your Worker > Settings > Variables and Secrets. Add encrypted secrets, not plain vars.
