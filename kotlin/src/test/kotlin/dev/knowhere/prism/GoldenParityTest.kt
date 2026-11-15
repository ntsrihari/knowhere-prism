package dev.knowhere.prism

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

/** Colour and scale parity with prism-web's golden outputs (testdata/golden/, written by `npm run golden`). */
class GoldenParityTest {
    private fun golden(name: String): JsonObject = Json.parseToJsonElement(Repo.file("testdata/golden/$name").readText()).jsonObject
    private fun JsonElement.str(): String = jsonPrimitive.content
    private fun JsonElement.strings(): List<String> = jsonArray.map { it.str() }

    @Test
    fun seedColours() {
        val g = golden("seeds.colors.json")
        assertEquals(PrismScheme.VARIANT, g.getValue("variant").str())
        assertEquals(PrismScheme.SPEC_VERSION, g.getValue("specVersion").str())
        assertEquals(ColorRole.entries.map { it.kotlinName }, g.getValue("roles").strings())
        val cases = g.getValue("cases").jsonArray
        assertEquals(12, cases.size)
        for (c in cases) {
            val seed = c.jsonObject.getValue("seed").str()
            for (mode in ColorSchemeName.entries) {
                val expected = c.jsonObject.getValue(mode.name.lowercase()).jsonObject.mapValues { it.value.str() }
                assertEquals(expected, PrismScheme.fromSeed(seed, mode).toHexMap(), "seed $seed $mode")
            }
        }
    }

    @Test
    fun defaultThemeTokens() {
        val g = golden("default-theme.tokens.json")
        val theme = PrismTheme.parse(Repo.file("contracts/testdata/theme/valid/default.json").readText())
        for (mode in ColorSchemeName.entries) {
            val e = g.getValue(mode.name.lowercase()).jsonObject
            val t = PrismTokens.from(theme, mode)
            assertEquals(e.getValue("colorScheme").str(), mode.name.lowercase())
            assertEquals(e.getValue("color").jsonObject.mapValues { it.value.str() }, t.color.toHexMap())
            assertShape(e.getValue("shape").jsonObject, t.shape)
            assertDensity(e.getValue("density").jsonObject, t.density)
            val ty = e.getValue("typography").jsonObject
            assertEquals(ty.getValue("fontFamily").strings(), t.typography.fontFamily)
            assertEquals(ty.getValue("monoFontFamily").strings(), t.typography.monoFontFamily)
            assertNexus(e.getValue("nexus").jsonObject, t.nexus)
        }
        // Web variable names: --md-<role-kebab> carries the same colour.
        val css = golden("default-theme.css-variables.json").getValue("dark").jsonObject
        val dark = PrismTokens.from(theme, ColorSchemeName.DARK).color
        for (role in ColorRole.entries) assertEquals(css.getValue(role.cssName).str(), dark.hex(role), role.cssName)
    }

    @Test
    fun scales() {
        val g = golden("scales.json")
        for ((r, v) in g.getValue("shape").jsonObject) assertShape(v.jsonObject, ShapeScale.from(r.toInt()))
        for ((r, v) in g.getValue("nexus").jsonObject) {
            val d = if (r.toInt() % 2 == 1) Density.COMPACT else Density.COMFORTABLE
            assertNexus(v.jsonObject, NexusCompatTokens.from(r.toInt(), d))
        }
        val dens = g.getValue("density").jsonObject
        assertDensity(dens.getValue("comfortable").jsonObject, DensityTokens.from(Density.COMFORTABLE))
        assertDensity(dens.getValue("compact").jsonObject, DensityTokens.from(Density.COMPACT))
        for ((font, v) in g.getValue("typography").jsonObject) {
            assertEquals(v.jsonObject.getValue("fontFamily").strings(), TypographyTokens.from(font).fontFamily, font)
        }
        assertEquals(PrismTheme.BUNDLED_FONTS, g.getValue("typography").jsonObject.keys)
    }

    private fun assertShape(e: JsonObject, s: ShapeScale) {
        val got = mapOf("none" to s.none, "extraSmall" to s.extraSmall, "small" to s.small, "medium" to s.medium, "large" to s.large, "extraLarge" to s.extraLarge, "full" to s.full)
        assertEquals(e.mapValues { it.value.jsonPrimitive.int }, got)
    }

    private fun assertDensity(e: JsonObject, d: DensityTokens) {
        assertEquals(e.getValue("density").str(), d.density.name.lowercase())
        assertEquals(e.getValue("scale").jsonPrimitive.int, d.scale)
        assertEquals(e.getValue("controlHeight").jsonPrimitive.int, d.controlHeight)
        val sp = d.spacing
        val got = mapOf("none" to sp.none, "xs" to sp.xs, "sm" to sp.sm, "md" to sp.md, "lg" to sp.lg, "xl" to sp.xl, "xxl" to sp.xxl)
        assertEquals(e.getValue("spacing").jsonObject.mapValues { it.value.jsonPrimitive.int }, got)
    }

    private fun assertNexus(e: JsonObject, n: NexusCompatTokens) {
        assertEquals(e.getValue("radiusS").jsonPrimitive.int, n.radiusS)
        assertEquals(e.getValue("radiusM").jsonPrimitive.int, n.radiusM)
        assertEquals(e.getValue("radiusL").jsonPrimitive.int, n.radiusL)
        assertEquals(e.getValue("space").str(), n.space)
    }
}
