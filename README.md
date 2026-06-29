# Roundtable-Rumble

Roundtable Rumble Digital — Phase 1 (rules engine)

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
