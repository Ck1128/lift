# Lift

A free, private workout planner for you and your friends. It is a web app that you add to your phone's Home Screen. There is no server, no account and no subscription.

**Status: Phase 1.** Only the app shell exists. Every schedule and workout you see is labeled "Sample data". Workout generation, saving data, and offline use are not built yet.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install      # download the tools the app needs (first time only)
npm run dev      # start the app, then open the address it prints
```

## Check that it works

```bash
npm run lint       # checks code style
npm run typecheck  # checks for type mistakes
npm test           # runs the automated tests
npm run build      # builds the final files into dist/
```

## Put it online (GitHub Pages)

1. Put this project in the GitHub repo named `lift` on the `main` branch.
2. On GitHub open **Settings -> Pages**.
3. Under **Build and deployment -> Source**, choose **GitHub Actions**.
4. Push to `main`. Open the **Actions** tab and wait for "Test and deploy to GitHub Pages" to finish.
5. The site address appears on that run. It normally looks like `https://YOUR-USERNAME.github.io/lift/`. This README does not list a URL because nothing has been deployed yet.

If the repo is not named `lift`, change `base` in `vite.config.ts` to match the repo name.

## Install on iPhone

1. Open the site address in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open it from the new icon.

Android (Chrome): menu -> **Install app** or **Add to Home screen**.

Installing and offline use have not been tested on a real phone yet.

## Privacy

Never commit workout data or backup files to this repo. Future versions will store data only on each phone.

## Troubleshooting

- **Blank page online:** check that `base` in `vite.config.ts` matches the repo name.
- **Actions failed:** open the failed run and read the red step; paste it back to Claude.
- **`npm: command not found`:** install Node.js.

## Roadmap

See `fit_workout_zero_cost_build_spec.md` for the full plan. Next: Phase 2 (local database, profile, equipment, backup).
