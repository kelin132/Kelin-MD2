# Live Battle Open Graph Test Findings

Tested on 2026-08-17:

- Page URL: https://aidoru.zone.id/battle#battle-room
- Fetched HTML URL: https://aidoru.zone.id/battle
- Page response: HTTP/2 200, content-type text/html; charset=utf-8.
- Live HTML contains `og:url=https://aidoru.zone.id/battle#battle-room`.
- Live HTML contains `og:type=website`.
- Live HTML contains `og:title=Pokémon Battle · AIDORU Arena`.
- Live HTML contains the expected battle description.
- Live HTML contains `og:image=https://aidoru.zone.id/aidoru-battle-preview.png`.
- Live HTML contains `og:image:alt`, width 1024, and height 1024.
- Live HTML contains Twitter `summary_large_image`, title, description, and image tags.
- The deployed HTML also contains an inherited `og:image:type=image/webp` tag, which conflicts with the supplied preview asset.
- Preview URL: https://aidoru.zone.id/aidoru-battle-preview.png
- Preview response reported `content-type: image/jpeg`, but the downloaded bytes identify as PNG (`1024 x 1024`, RGB). This MIME/extension mismatch should be corrected for reliable Discord and Telegram rendering.
- Preview asset SHA-256 from live response: a823d79faad8120f80ae073c25b64939a93d8210f07ae9607b24927eeabad78a.

Conclusion before fix: metadata is present, but the inherited WebP type tag and the live image MIME mismatch make the preview not fully platform-safe yet.
