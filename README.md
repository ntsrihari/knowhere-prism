# Prism

Prism is the shared Knowhere theme library. It provides:

- the theme contracts (`contracts/`): `knowhere.theme` 0.1.0, a copy of the Nexus contract, and `knowhere.themepack` 0.1.0, which is new. Both come with JSON Schemas and `<code>--<desc>` fixtures;
- a canonical Material 3 token spec ([TOKENS.md](TOKENS.md)) with golden values in `testdata/golden/`;
- **prism-web** (`packages/prism-web`): a TypeScript ESM library and the `prism` CLI. It validates documents, generates the scheme and writes CSS variables;
- **prism-kotlin** (`kotlin/`): a Kotlin/JVM library with the same validation and the same tokens, for Milano;
- a static theme **preview** (`preview/`) that works under CSP `default-src 'self'`.

## Requirements
Node 22+, npm 10+, JDK 17+ (CI uses 21). Gradle comes through the wrapper (8.14.3).

## Build and test
```bash
npm ci                     # installs both workspaces (.npmrc sets legacy-peer-deps)
npm test                   # prism-web: typecheck + Vitest; preview: typecheck + build + CSP test
npm run build              # packages/prism-web/dist and preview/dist
npm run golden             # regenerate testdata/golden/ from prism-web (review the diff)

cd kotlin && ./gradlew test   # Kotlin: fixtures + golden colour/scale parity
                              # (offline sandbox: /opt/gradle/bin/gradle test)
```

## CLI
```bash
npx prism validate contracts/testdata/theme/valid/default.json        # exit 0 ok, 1 invalid, 2 usage/IO
npx prism validate --json some-pack.json
npx prism css contracts/testdata/theme/valid/default.json --mode light --selector ':root'
npx prism css pack.json --theme "Knowhere Light"
```

## Web API (`@knowhere/prism-web`)
```ts
import { validateTheme, validateThemePack, generateScheme, generateTokens, toCssVariables, toCss, applyTheme } from '@knowhere/prism-web';

const r = validateTheme(rawJsonTextOrBytes);       // { ok, value, mode: 'strict'|'pruned' } | { ok: false, error: { code, problems } }
if (r.ok) applyTheme(document.documentElement, r.value);   // CSSOM only, so CSP-safe
```
Pass the raw text or bytes so that the 4 KB / 256 KB size caps, duplicate keys and trailing data are checked. `ValidateOptions` overrides the font allowlist and the built-in wallpaper keys.

## Kotlin (`dev.knowhere:prism`)
Milano can consume the library as an included build:
```kotlin
// settings.gradle.kts
includeBuild("../knowhere-prism/kotlin")
// app/build.gradle.kts
implementation("dev.knowhere:prism:0.1.0")
```
```kotlin
val theme = PrismTheme.parse(json)                       // or PrismTheme.validate(bytes) -> ValidationResult
val tokens = PrismTokens.from(theme, ColorSchemeName.DARK)
val primary = Color(tokens.color[ColorRole.PRIMARY])     // ARGB Int
```

## Preview
Run `npm run build`, then serve `preview/dist/` from any static server (for example `python3 -m http.server -d preview/dist`). It offers sample themes, file open and paste, `?theme=themes/<file>.json`, light and dark swatches for all 49 roles, the shape, density and font scales, and validation errors.

## Layout
`contracts/` contracts and fixtures · `testdata/golden/` shared golden outputs · `packages/prism-web/` · `kotlin/` · `preview/` · `DECISIONS.md` · `TASKS.md` · `DELIVERY_STATUS.md`
