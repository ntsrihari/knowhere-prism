package dev.knowhere.prism

import com.materialkolor.dynamiccolor.ColorSpec
import com.materialkolor.hct.Hct
import com.materialkolor.scheme.DynamicScheme
import com.materialkolor.scheme.SchemeTonalSpot

/**
 * Material 3 colour roles in canonical order (TOKENS.md). [kotlinName] is the
 * camelCase name (Compose ColorScheme property); [cssName] is the web variable.
 */
public enum class ColorRole(public val kotlinName: String, internal val get: (DynamicScheme) -> Int) {
    PRIMARY("primary", { it.primary }),
    ON_PRIMARY("onPrimary", { it.onPrimary }),
    PRIMARY_CONTAINER("primaryContainer", { it.primaryContainer }),
    ON_PRIMARY_CONTAINER("onPrimaryContainer", { it.onPrimaryContainer }),
    INVERSE_PRIMARY("inversePrimary", { it.inversePrimary }),
    PRIMARY_FIXED("primaryFixed", { it.primaryFixed }),
    PRIMARY_FIXED_DIM("primaryFixedDim", { it.primaryFixedDim }),
    ON_PRIMARY_FIXED("onPrimaryFixed", { it.onPrimaryFixed }),
    ON_PRIMARY_FIXED_VARIANT("onPrimaryFixedVariant", { it.onPrimaryFixedVariant }),
    SECONDARY("secondary", { it.secondary }),
    ON_SECONDARY("onSecondary", { it.onSecondary }),
    SECONDARY_CONTAINER("secondaryContainer", { it.secondaryContainer }),
    ON_SECONDARY_CONTAINER("onSecondaryContainer", { it.onSecondaryContainer }),
    SECONDARY_FIXED("secondaryFixed", { it.secondaryFixed }),
    SECONDARY_FIXED_DIM("secondaryFixedDim", { it.secondaryFixedDim }),
    ON_SECONDARY_FIXED("onSecondaryFixed", { it.onSecondaryFixed }),
    ON_SECONDARY_FIXED_VARIANT("onSecondaryFixedVariant", { it.onSecondaryFixedVariant }),
    TERTIARY("tertiary", { it.tertiary }),
    ON_TERTIARY("onTertiary", { it.onTertiary }),
    TERTIARY_CONTAINER("tertiaryContainer", { it.tertiaryContainer }),
    ON_TERTIARY_CONTAINER("onTertiaryContainer", { it.onTertiaryContainer }),
    TERTIARY_FIXED("tertiaryFixed", { it.tertiaryFixed }),
    TERTIARY_FIXED_DIM("tertiaryFixedDim", { it.tertiaryFixedDim }),
    ON_TERTIARY_FIXED("onTertiaryFixed", { it.onTertiaryFixed }),
    ON_TERTIARY_FIXED_VARIANT("onTertiaryFixedVariant", { it.onTertiaryFixedVariant }),
    ERROR("error", { it.error }),
    ON_ERROR("onError", { it.onError }),
    ERROR_CONTAINER("errorContainer", { it.errorContainer }),
    ON_ERROR_CONTAINER("onErrorContainer", { it.onErrorContainer }),
    BACKGROUND("background", { it.background }),
    ON_BACKGROUND("onBackground", { it.onBackground }),
    SURFACE("surface", { it.surface }),
    ON_SURFACE("onSurface", { it.onSurface }),
    SURFACE_VARIANT("surfaceVariant", { it.surfaceVariant }),
    ON_SURFACE_VARIANT("onSurfaceVariant", { it.onSurfaceVariant }),
    SURFACE_DIM("surfaceDim", { it.surfaceDim }),
    SURFACE_BRIGHT("surfaceBright", { it.surfaceBright }),
    SURFACE_CONTAINER_LOWEST("surfaceContainerLowest", { it.surfaceContainerLowest }),
    SURFACE_CONTAINER_LOW("surfaceContainerLow", { it.surfaceContainerLow }),
    SURFACE_CONTAINER("surfaceContainer", { it.surfaceContainer }),
    SURFACE_CONTAINER_HIGH("surfaceContainerHigh", { it.surfaceContainerHigh }),
    SURFACE_CONTAINER_HIGHEST("surfaceContainerHighest", { it.surfaceContainerHighest }),
    SURFACE_TINT("surfaceTint", { it.surfaceTint }),
    INVERSE_SURFACE("inverseSurface", { it.inverseSurface }),
    INVERSE_ON_SURFACE("inverseOnSurface", { it.inverseOnSurface }),
    OUTLINE("outline", { it.outline }),
    OUTLINE_VARIANT("outlineVariant", { it.outlineVariant }),
    SCRIM("scrim", { it.scrim }),
    SHADOW("shadow", { it.shadow });

    /** "--md-<role-kebab>" (web, Nexus-compatible). "--prism-<role-kebab>" is an alias. */
    public val cssName: String get() = "--md-" + kebab(kotlinName)
}

internal fun kebab(name: String): String = name.replace(Regex("[A-Z]")) { "-" + it.value.lowercase() }

/** "#rrggbb" (lowercase), or "#rrggbbaa" when not opaque; same as prism-web. */
public fun hexFromArgb(argb: Int): String {
    val rgb = "%06x".format(argb and 0xFFFFFF)
    val alpha = (argb ushr 24) and 0xFF
    return if (alpha == 0xFF) "#$rgb" else "#$rgb" + "%02x".format(alpha)
}

/** Colour roles mapped to ARGB ints (for Compose `Color(argb)`) with hex accessors. */
public data class PrismColorScheme(val argb: Map<ColorRole, Int>) {
    public operator fun get(role: ColorRole): Int = argb.getValue(role)
    public fun hex(role: ColorRole): String = hexFromArgb(get(role))
    /** kotlinName -> "#rrggbb", in canonical order. */
    public fun toHexMap(): Map<String, String> = ColorRole.entries.associate { it.kotlinName to hex(it) }
}

public object PrismScheme {
    public const val VARIANT: String = "tonalSpot"
    public const val SPEC_VERSION: String = "2021"
    public const val CONTRAST_LEVEL: Double = 0.0

    /** SchemeTonalSpot, spec 2021, contrast 0 (matches prism-web / Nexus). */
    public fun fromSeed(seedColor: String, mode: ColorSchemeName): PrismColorScheme {
        require(Regex("^#[0-9A-Fa-f]{6}$").matches(seedColor)) { "seedColor must be #RRGGBB" }
        val argb = (0xFF shl 24) or seedColor.substring(1).toInt(16)
        val scheme = SchemeTonalSpot(
            Hct.fromInt(argb), mode == ColorSchemeName.DARK, CONTRAST_LEVEL,
            ColorSpec.SpecVersion.SPEC_2021, DynamicScheme.Platform.PHONE,
        )
        return PrismColorScheme(ColorRole.entries.associateWith { it.get(scheme) })
    }
}

public data class ShapeScale(
    val none: Int, val extraSmall: Int, val small: Int, val medium: Int, val large: Int, val extraLarge: Int, val full: Int,
) {
    public companion object {
        public const val FULL: Int = 9999
        private fun third(k: Int, r: Int): Int = (2 * k * r + 3) / 6

        /** cornerRadius is the "medium" step; others are round(k*r/3), halves up. */
        public fun from(cornerRadius: Int): ShapeScale =
            ShapeScale(0, third(1, cornerRadius), third(2, cornerRadius), cornerRadius, third(4, cornerRadius), third(7, cornerRadius), FULL)
    }
}

public data class Spacing(val none: Int, val xs: Int, val sm: Int, val md: Int, val lg: Int, val xl: Int, val xxl: Int)

public data class DensityTokens(val density: Density, val scale: Int, val controlHeight: Int, val spacing: Spacing) {
    public companion object {
        public fun from(d: Density): DensityTokens = when (d) {
            Density.COMPACT -> DensityTokens(d, -2, 32, Spacing(0, 2, 4, 8, 12, 16, 24))
            Density.COMFORTABLE -> DensityTokens(d, 0, 40, Spacing(0, 4, 8, 12, 16, 24, 32))
        }
    }
}

public data class TypographyTokens(val font: String, val fontFamily: List<String>, val monoFontFamily: List<String>) {
    public companion object {
        private val SANS = listOf("system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif")
        private val MONO = listOf("ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace")
        public val MONO_STACK: List<String> = listOf("JetBrains Mono") + MONO
        public val FONT_STACKS: Map<String, List<String>> = mapOf(
            "inter" to listOf("Inter") + SANS,
            "roboto" to listOf("Roboto") + SANS.filter { it != "Roboto" },
            "roboto-flex" to listOf("Roboto Flex") + SANS,
            "jetbrains-mono" to MONO_STACK,
        )

        public fun from(font: String): TypographyTokens =
            TypographyTokens(font, FONT_STACKS[font] ?: (listOf("system-ui") + SANS.drop(1)), MONO_STACK)
    }
}

/** Nexus M1 variables --radius-s/m/l and --space. */
public data class NexusCompatTokens(val radiusS: Int, val radiusM: Int, val radiusL: Int, val space: String) {
    public companion object {
        public fun from(cornerRadius: Int, density: Density): NexusCompatTokens = NexusCompatTokens(
            (cornerRadius + 1) / 2, cornerRadius, (3 * cornerRadius + 1) / 2,
            if (density == Density.COMPACT) "0.75rem" else "1rem",
        )
    }
}

public data class PrismTokens(
    val colorScheme: ColorSchemeName,
    val color: PrismColorScheme,
    val shape: ShapeScale,
    val density: DensityTokens,
    val typography: TypographyTokens,
    val nexus: NexusCompatTokens,
) {
    public companion object {
        /** All tokens for a theme; mode defaults to the theme's colorScheme. */
        public fun from(theme: Theme, mode: ColorSchemeName = theme.colorScheme): PrismTokens = PrismTokens(
            mode,
            PrismScheme.fromSeed(theme.seedColor, mode),
            ShapeScale.from(theme.cornerRadius),
            DensityTokens.from(theme.density),
            TypographyTokens.from(theme.font),
            NexusCompatTokens.from(theme.cornerRadius, theme.density),
        )
    }
}
