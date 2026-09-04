# Prince Tech endpoint mappings

User-provided endpoints for fallback integration:

- `.play` audio fallback: `https://api.princetechn.com/api/download/mp3?apikey=prince&url=<encoded-youtube-url>`
- `.play` video fallback candidate: `https://api.princetechn.com/api/download/ytmp4?apikey=prince&url=<encoded-youtube-url>`
- `.yt` video fallback: `https://api.princetechn.com/api/download/mp4?apikey=prince&url=<encoded-youtube-url>`
- `.yt` video fallback candidate: `https://api.princetechn.com/api/download/ytvid?apikey=prince&format=360p&url=<encoded-youtube-url>`
- `.ig` Instagram fallback: `https://api.princetechn.com/api/download/instadl?apikey=prince&url=<encoded-instagram-url>`
- Fancy-text API: `https://api.princetechn.com/api/tools/fancy?apikey=prince&text=<encoded-text>`
- AI fallback: `https://api.princetechn.com/api/ai/gpt4o-mini?apikey=prince&q=<encoded-question>`
- Image/ephoto fallback: `https://api.princetechn.com/api/ephoto360/glossysilver?apikey=prince&text=<encoded-text>`

Example URLs supplied by user:
- YouTube audio: `https://youtu.be/60ItHLz5WEA?feature=shared`
- YouTube video: `https://youtu.be/wdJrTQJh1ZQ?feature=shared`
- Instagram reel: `https://www.instagram.com/reel/C9bjQfRprHK`
- Fancy text: `Prince Tech`
- AI query: `Whats Your Model`
- Glossy silver image text: `Prince Tech`

Do not expose the API key in user-facing messages. Use URL encoding for all query parameters and preserve existing provider order unless explicitly changed by the user.
