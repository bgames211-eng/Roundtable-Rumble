# Roundtable Rumble

Roundtable Rumble — Phase 1 (rules engine)

Run tests:

1. Install dev dependencies:

```bash
npm install
```

2. Run test suite:

```bash
npm test
```

The test suite uses Vitest and validates board loop behaviour, territory crossing, attack/self-defend adjacency, and King Territory Draw rules.

Local multiplayer

1. Run `npm install` once.
2. Open one terminal and run `npm run server`.
3. Open a second terminal and run `npm run dev`.
4. Open the site in your browser at the Vite URL it prints.
5. To test on another device on the same Wi-Fi, set `VITE_MULTIPLAYER_SERVER_URL` to your computer's local IP plus `:3001` before starting Vite.

If the multiplayer server is hosted online, you do not need the terminal to play. You only open the website, click `Begin`, then `Host Game` or `Join Game`.

Room-code flow

1. One player clicks `Host Room`.
2. The app shows a room code.
3. The other player enters that code and clicks `Join Room`.
4. The host's game state is mirrored to the other device in real time.
5. If either browser refreshes, it will try to rejoin the last room automatically.

Easy updates workflow

1. Work on a branch.
2. Open a pull request.
3. CI runs tests + build automatically.
4. Merge to `main` when green.
5. `main` auto-deploys to GitHub Pages via workflow.

First step to make this public

1. Push this project to a GitHub repository.

Then, in GitHub:

1. Open Settings -> Pages.
2. Set Source to `GitHub Actions`.
3. Push to `main` (or click `Run workflow` on `Deploy to GitHub Pages`).

Your site will publish to:

- `https://<your-github-username>.github.io/<repo-name>/`

Multiplayer server hosting

1. Create a free Render account.
2. Connect this GitHub repo to Render as a Web Service.
3. Use `npm install` as the build/install step.
4. Use `npm run server` as the start command.
5. Copy the Render URL and set it as `VITE_MULTIPLAYER_SERVER_URL` for the frontend build.
6. In GitHub, add a repository secret named `VITE_MULTIPLAYER_SERVER_URL` with that Render URL.
