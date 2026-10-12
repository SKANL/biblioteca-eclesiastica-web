# Web regression harnesses

Run from the web repository; dependencies resolve from its own `node_modules`.
Real inputs have one canonical home: `../pipeline-OCR/tests/fixtures/`.

```powershell
npm test
npm run lint
npm run typecheck -- --incremental false
node tests/tools/reader-browser-fixture.mjs <existing temporary directory>
```

| File | Role |
|---|---|
| `test-reader-image.mjs` | Node reader image/scroll/retry geometry checks |
| `test-reader-matches.mjs` | Node Unicode and match navigation checks |
| `reader-browser-fixture.mjs` | Isolated real-component browser fixture; mocks Next navigation, not a production test |
| `check-routing-regressions.mjs` | Exported Playwright `checkRoutingRegressions(page, {base})`; defaults to `WEB_BASE_URL` or `http://127.0.0.1:3010`; derives image interception from the actual reader source |

Only `scripts/generate-icons.mjs` is operational (`npm run icons`); everything
else lives in `tests/tools/` and runs as shown above. `npm test` runs the two
`test-reader-*.mjs` files and needs Node >= 22.18. Do not rebuild/delete the
live `.next`.
