# Secure video relay — ArtForge (Wan 2.7 / fal.ai)

This Worker scaffold is **not deployed** and does not trigger any video generation by itself.

## Configuration
1. Create a Cloudflare Worker and deploy `worker.js`.
2. Add encrypted secrets: `FAL_KEY` and `ARTFORGE_ACCESS_TOKEN`.
3. Set variable `FAL_VIDEO_ENDPOINT` to `fal-ai/wan/v2.7/text-to-video`.
4. The Worker accepts requests only from the ArtForge GitHub Pages origin.
5. `GET /health` reports configuration status only.

## Endpoints
- `POST /submit`: prompt, duration (5/8/10s), aspect_ratio (9:16/16:9/1:1), resolution (initially 720p only).
- `GET /status?request_id=<id>`: queue status.
- `GET /result?request_id=<id>`: retrieve completed output.

All calls require `Authorization: Bearer <ARTFORGE_ACCESS_TOKEN>`.

## Cost safeguards
- Initial integration restricts output to 720p.
- Duration is capped at 10 seconds per request and accepted values are 5, 8 or 10 seconds.
- Wan 2.7 pricing shown by fal is currently $0.10 per second at 720p: a 5s request is about $0.50, an 8s request $0.80, a 10s request $1.00. Pricing can change; verify before testing.
- This Worker does not check provider account balance and does not impose an aggregate spend limit. Do not expose it publicly or enable generation before adding rate/budget controls.
- No generation is triggered by deployment or health checks.

Never commit API keys or tokens. Configure secrets in Cloudflare dashboard > Workers & Pages > Worker > Settings > Variables and Secrets.
