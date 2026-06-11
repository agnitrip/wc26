# wc26 — Pregame

Static site for 2026 FIFA World Cup fans. Streaming comparison, watch-party directory, schedule grid across PT/MT/CT/ET/Mexico time zones, and a penalty-shootout mini-game.

Live at **[wc26pregame.com](https://wc26pregame.com)**.

## Stack

Vanilla HTML, CSS, and JavaScript. No framework, no build step, no backend. `localStorage` for any persistence. Cookieless analytics via [Plausible](https://plausible.io). Deployed on Vercel.

## Features

- **Streaming picker** — compare services side-by-side for the matches you care about.
- **Watch-party directory** — bars and venues showing the tournament across US/CA/MX host cities.
- **Schedule grid** — every match in your local time zone.
- **Pregame Shootout** — penalty-shootout trivia game with streak-based difficulty (`/game/shootout`).

## Run locally

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765`.

Or use the included Vercel CLI:

```bash
npx vercel dev
```

## Built with Claude Code

Product, design, and curation calls are mine. Implementation was AI-assisted with [Claude Code](https://claude.ai/code). Commit history reflects this.

## License

Code: [MIT](LICENSE). Hero images were generated with ChatGPT (OpenAI) and are free to reuse. Schedule, streaming, and watch-party data are aggregated from public sources.
