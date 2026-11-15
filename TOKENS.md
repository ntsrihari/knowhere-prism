# Prism token specification (v0.1)

Canonical list of tokens Prism derives from a `knowhere.theme` 0.1 document. Both
implementations (`packages/prism-web`, `kotlin/`) emit exactly these, and
`testdata/golden/` pins their values; a change here is a change to the golden files.

## 1. Colour roles

- **Algorithm:** Material Color Utilities `SchemeTonalSpot`, colour spec **2021**,
  contrast level **0**, platform phone. Source colour = `seedColor`. This is the same
  call Nexus already makes in `frontend/src/lib/theme.ts` (MCU 0.4.0, default spec 2021).
- **Light/dark:** both are generated on demand. The theme's `colorScheme` is the default mode.
- **Format:** lowercase `#rrggbb`. If a role ever has alpha below 255 it is `#rrggbbaa`
  (none do in spec 2021).
- **Names:**
  - Kotlin/Compose: the camelCase name (`ColorRole.kotlinName`, matches `androidx.compose.material3.ColorScheme` properties where they exist).
  - Web: `--md-<role-kebab>` is canonical (Nexus-compatible), and `--prism-<role-kebab>` is an identical alias.
  - Kebab rule: each uppercase letter becomes `-` + lowercase (`surfaceContainerLowest` → `surface-container-lowest`).

Canonical order, with the default theme (`#6750A4`) values:

| Role | Web (canonical) | Web alias | Kotlin enum | Light | Dark |
|---|---|---|---|---|---|
| `primary` | `--md-primary` | `--prism-primary` | `ColorRole.PRIMARY` | `#65558f` | `#cfbdfe` |
| `onPrimary` | `--md-on-primary` | `--prism-on-primary` | `ColorRole.ON_PRIMARY` | `#ffffff` | `#36275d` |
| `primaryContainer` | `--md-primary-container` | `--prism-primary-container` | `ColorRole.PRIMARY_CONTAINER` | `#e9ddff` | `#4d3d75` |
| `onPrimaryContainer` | `--md-on-primary-container` | `--prism-on-primary-container` | `ColorRole.ON_PRIMARY_CONTAINER` | `#4d3d75` | `#e9ddff` |
| `inversePrimary` | `--md-inverse-primary` | `--prism-inverse-primary` | `ColorRole.INVERSE_PRIMARY` | `#cfbdfe` | `#65558f` |
| `primaryFixed` | `--md-primary-fixed` | `--prism-primary-fixed` | `ColorRole.PRIMARY_FIXED` | `#e9ddff` | `#e9ddff` |
| `primaryFixedDim` | `--md-primary-fixed-dim` | `--prism-primary-fixed-dim` | `ColorRole.PRIMARY_FIXED_DIM` | `#cfbdfe` | `#cfbdfe` |
| `onPrimaryFixed` | `--md-on-primary-fixed` | `--prism-on-primary-fixed` | `ColorRole.ON_PRIMARY_FIXED` | `#201047` | `#201047` |
| `onPrimaryFixedVariant` | `--md-on-primary-fixed-variant` | `--prism-on-primary-fixed-variant` | `ColorRole.ON_PRIMARY_FIXED_VARIANT` | `#4d3d75` | `#4d3d75` |
| `secondary` | `--md-secondary` | `--prism-secondary` | `ColorRole.SECONDARY` | `#625b71` | `#cbc2db` |
| `onSecondary` | `--md-on-secondary` | `--prism-on-secondary` | `ColorRole.ON_SECONDARY` | `#ffffff` | `#332d41` |
| `secondaryContainer` | `--md-secondary-container` | `--prism-secondary-container` | `ColorRole.SECONDARY_CONTAINER` | `#e8def8` | `#4a4458` |
| `onSecondaryContainer` | `--md-on-secondary-container` | `--prism-on-secondary-container` | `ColorRole.ON_SECONDARY_CONTAINER` | `#4a4458` | `#e8def8` |
| `secondaryFixed` | `--md-secondary-fixed` | `--prism-secondary-fixed` | `ColorRole.SECONDARY_FIXED` | `#e8def8` | `#e8def8` |
| `secondaryFixedDim` | `--md-secondary-fixed-dim` | `--prism-secondary-fixed-dim` | `ColorRole.SECONDARY_FIXED_DIM` | `#cbc2db` | `#cbc2db` |
| `onSecondaryFixed` | `--md-on-secondary-fixed` | `--prism-on-secondary-fixed` | `ColorRole.ON_SECONDARY_FIXED` | `#1e192b` | `#1e192b` |
| `onSecondaryFixedVariant` | `--md-on-secondary-fixed-variant` | `--prism-on-secondary-fixed-variant` | `ColorRole.ON_SECONDARY_FIXED_VARIANT` | `#4a4458` | `#4a4458` |
| `tertiary` | `--md-tertiary` | `--prism-tertiary` | `ColorRole.TERTIARY` | `#7e5260` | `#efb8c8` |
| `onTertiary` | `--md-on-tertiary` | `--prism-on-tertiary` | `ColorRole.ON_TERTIARY` | `#ffffff` | `#4a2532` |
| `tertiaryContainer` | `--md-tertiary-container` | `--prism-tertiary-container` | `ColorRole.TERTIARY_CONTAINER` | `#ffd9e3` | `#633b48` |
| `onTertiaryContainer` | `--md-on-tertiary-container` | `--prism-on-tertiary-container` | `ColorRole.ON_TERTIARY_CONTAINER` | `#633b48` | `#ffd9e3` |
| `tertiaryFixed` | `--md-tertiary-fixed` | `--prism-tertiary-fixed` | `ColorRole.TERTIARY_FIXED` | `#ffd9e3` | `#ffd9e3` |
| `tertiaryFixedDim` | `--md-tertiary-fixed-dim` | `--prism-tertiary-fixed-dim` | `ColorRole.TERTIARY_FIXED_DIM` | `#efb8c8` | `#efb8c8` |
| `onTertiaryFixed` | `--md-on-tertiary-fixed` | `--prism-on-tertiary-fixed` | `ColorRole.ON_TERTIARY_FIXED` | `#31101d` | `#31101d` |
| `onTertiaryFixedVariant` | `--md-on-tertiary-fixed-variant` | `--prism-on-tertiary-fixed-variant` | `ColorRole.ON_TERTIARY_FIXED_VARIANT` | `#633b48` | `#633b48` |
| `error` | `--md-error` | `--prism-error` | `ColorRole.ERROR` | `#ba1a1a` | `#ffb4ab` |
| `onError` | `--md-on-error` | `--prism-on-error` | `ColorRole.ON_ERROR` | `#ffffff` | `#690005` |
| `errorContainer` | `--md-error-container` | `--prism-error-container` | `ColorRole.ERROR_CONTAINER` | `#ffdad6` | `#93000a` |
| `onErrorContainer` | `--md-on-error-container` | `--prism-on-error-container` | `ColorRole.ON_ERROR_CONTAINER` | `#93000a` | `#ffdad6` |
| `background` | `--md-background` | `--prism-background` | `ColorRole.BACKGROUND` | `#fdf7ff` | `#141218` |
| `onBackground` | `--md-on-background` | `--prism-on-background` | `ColorRole.ON_BACKGROUND` | `#1d1b20` | `#e6e0e9` |
| `surface` | `--md-surface` | `--prism-surface` | `ColorRole.SURFACE` | `#fdf7ff` | `#141218` |
| `onSurface` | `--md-on-surface` | `--prism-on-surface` | `ColorRole.ON_SURFACE` | `#1d1b20` | `#e6e0e9` |
| `surfaceVariant` | `--md-surface-variant` | `--prism-surface-variant` | `ColorRole.SURFACE_VARIANT` | `#e7e0eb` | `#49454e` |
| `onSurfaceVariant` | `--md-on-surface-variant` | `--prism-on-surface-variant` | `ColorRole.ON_SURFACE_VARIANT` | `#49454e` | `#cac4cf` |
| `surfaceDim` | `--md-surface-dim` | `--prism-surface-dim` | `ColorRole.SURFACE_DIM` | `#ded8e0` | `#141218` |
| `surfaceBright` | `--md-surface-bright` | `--prism-surface-bright` | `ColorRole.SURFACE_BRIGHT` | `#fdf7ff` | `#3b383e` |
| `surfaceContainerLowest` | `--md-surface-container-lowest` | `--prism-surface-container-lowest` | `ColorRole.SURFACE_CONTAINER_LOWEST` | `#ffffff` | `#0f0d13` |
| `surfaceContainerLow` | `--md-surface-container-low` | `--prism-surface-container-low` | `ColorRole.SURFACE_CONTAINER_LOW` | `#f8f2fa` | `#1d1b20` |
| `surfaceContainer` | `--md-surface-container` | `--prism-surface-container` | `ColorRole.SURFACE_CONTAINER` | `#f2ecf4` | `#211f24` |
| `surfaceContainerHigh` | `--md-surface-container-high` | `--prism-surface-container-high` | `ColorRole.SURFACE_CONTAINER_HIGH` | `#ece6ee` | `#2b292f` |
| `surfaceContainerHighest` | `--md-surface-container-highest` | `--prism-surface-container-highest` | `ColorRole.SURFACE_CONTAINER_HIGHEST` | `#e6e0e9` | `#36343a` |
| `surfaceTint` | `--md-surface-tint` | `--prism-surface-tint` | `ColorRole.SURFACE_TINT` | `#65558f` | `#cfbdfe` |
| `inverseSurface` | `--md-inverse-surface` | `--prism-inverse-surface` | `ColorRole.INVERSE_SURFACE` | `#322f35` | `#e6e0e9` |
| `inverseOnSurface` | `--md-inverse-on-surface` | `--prism-inverse-on-surface` | `ColorRole.INVERSE_ON_SURFACE` | `#f5eff7` | `#322f35` |
| `outline` | `--md-outline` | `--prism-outline` | `ColorRole.OUTLINE` | `#7a757f` | `#948f99` |
| `outlineVariant` | `--md-outline-variant` | `--prism-outline-variant` | `ColorRole.OUTLINE_VARIANT` | `#cac4cf` | `#49454e` |
| `scrim` | `--md-scrim` | `--prism-scrim` | `ColorRole.SCRIM` | `#000000` | `#000000` |
| `shadow` | `--md-shadow` | `--prism-shadow` | `ColorRole.SHADOW` | `#000000` | `#000000` |

These are 49 roles. The `*Dim` roles and palette key colours belong to spec 2025, so they are not emitted.

## 2. Shape (from `cornerRadius` r, 0–32)

r is the **medium** step. The other steps follow the M3 default ratios (r = 12 gives 0/4/8/12/16/28):
`round(k·r/3)`, with halves rounded up and computed in integers as `(2·k·r + 3) div 6`.

| Step | Formula | r = 12 | Web | Kotlin |
|---|---|---|---|---|
| none | 0 | 0 | `--prism-shape-corner-none` | `ShapeScale.none` |
| extraSmall | k = 1 | 4 | `--prism-shape-corner-extra-small` | `extraSmall` |
| small | k = 2 | 8 | `--prism-shape-corner-small` | `small` |
| medium | r | 12 | `--prism-shape-corner-medium` | `medium` |
| large | k = 4 | 16 | `--prism-shape-corner-large` | `large` |
| extraLarge | k = 7 | 28 | `--prism-shape-corner-extra-large` | `extraLarge` |
| full | 9999 | 9999 | `--prism-shape-corner-full` | `full` |

Web values are in `px`; Android values are in `dp`.

## 3. Density

| Token | comfortable | compact | Web |
|---|---|---|---|
| scale (M3 density) | 0 | -2 | `--prism-density-scale` |
| controlHeight | 40 | 32 | `--prism-control-height` |
| spacing none / xs / sm / md / lg / xl / xxl | 0 / 4 / 8 / 12 / 16 / 24 / 32 | 0 / 2 / 4 / 8 / 12 / 16 / 24 | `--prism-space-<name>` |

## 4. Typography

`font` is a key from the bundled allowlist. Fonts are bundled, never fetched remotely (CSP).

| Key | Family stack (first entry is the bundled family) |
|---|---|
| inter | Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif |
| roboto | Roboto, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif |
| roboto-flex | Roboto Flex, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif |
| jetbrains-mono | JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace |

The monospace stack is always the jetbrains-mono stack. On the web, `--prism-font-family` and
`--prism-font-family-mono` hold these stacks, with every non-generic name double-quoted.
On Android, Milano maps the key to its bundled `FontFamily`, and the stack is informational.

## 5. Nexus M1 compatibility variables (web only)

Prism also emits the variables Nexus M1 already uses, with the same formulas:
`--radius-s` = round(r/2), `--radius-m` = r, `--radius-l` = round(1.5·r) (halves up),
`--space` = `1rem` for comfortable or `0.75rem` for compact, and `--font` = `--prism-font-family`.
`toCss()` and `applyTheme()` also set `color-scheme`.
