# Delivery status: Prism v0.1 (local repo, not pushed)

## What works
- **Contracts:** `contracts/knowhere.theme-0.1.schema.json` (copied from Nexus) with its 30 fixtures. The new `contracts/knowhere.themepack-0.1.schema.json` has 5 valid and 22 invalid fixtures (`<code>--<desc>.json`).
- **TOKENS.md:** 49 M3 roles (`--md-*` canonical, Nexus-compatible; `--prism-*` alias; Kotlin `ColorRole`), plus shape, density, fonts and the Nexus compat variables.
- **prism-web** (`packages/prism-web`): validateTheme and validateThemePack (R-17, 4 KB / 256 KB caps, strict JSON), generateScheme / generateTokens, toCssVariables / toCss, applyTheme, and the `prism validate|css` CLI. **171 Vitest tests pass**, covering Ajv cross-checks against the JSON Schemas and the golden outputs.
- **Kotlin** (`kotlin/`, `dev.knowhere:prism`): the same validation and tokens. **74 JUnit tests pass**, including parity with `testdata/golden/` (12 seeds × light/dark, default theme tokens, `--md-*` names, every shape radius 0–32, density, fonts).
- **Preview** (`preview/dist`): works under CSP `default-src 'self'`. A static CSP test passes (4/4). A headless Chrome smoke check rendered 98 swatches and showed validation errors, with no CSP violations.
- **CI** (`.github/workflows/ci.yml`): web and Kotlin jobs, SHA-pinned actions, `permissions: contents: read`, and a golden drift check.

## Commands
```bash
cd /home/user/knowhere-prism
npm ci && npm test                     # 171 + 4 tests
npm run golden                         # regenerate goldens (CI checks for drift)
cd kotlin && ./gradlew test            # or /opt/gradle/bin/gradle --no-daemon test (sandbox)
node packages/prism-web/dist/cli.js css contracts/testdata/theme/valid/default.json
```

## Gaps / notes
- Not pushed; the GitHub repo does not exist yet. CI has not run on GitHub.
- `kotlin/gradle/wrapper/gradle-wrapper.properties` has no `distributionSha256Sum`, because services.gradle.org is blocked here. Add it before the first push.
- actions/setup-java is pinned to v6.2.0 (77dd5b2…). Its release date could not be checked from the sandbox.
- MCU 0.4.0 cannot be imported by plain Node ESM, so prism-web ships it bundled in `dist/` (see DECISIONS D-03).
- Out of scope: npm or Maven publishing, Nexus migrating to Prism or adding a converter, Milano wiring, and distribution of wallpaper image bytes.
