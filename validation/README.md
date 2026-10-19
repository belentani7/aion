# Browser verification

Run the application locally on port 4184. Browser checks are separate from the production dependencies.

```sh
npm install --no-save --package-lock=false --ignore-scripts playwright@1.56.1 @axe-core/playwright@4.11.0
npx playwright install chromium
node validation/browser-check.cjs
node validation/interaction-check.cjs
```

Run from the project root. These checks exercise public entry states, the component gallery and synthesized slider gestures. They do not authenticate to real providers or certify a full WCAG audit.
