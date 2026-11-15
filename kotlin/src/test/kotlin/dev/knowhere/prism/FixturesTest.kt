package dev.knowhere.prism

import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class FixturesTest {
    private fun run(contract: String, validate: (ByteArray) -> ValidationResult<*>): List<DynamicTest> {
        val valid = Repo.fixtures(contract, "valid").map { f ->
            DynamicTest.dynamicTest("$contract accepts ${f.name}") {
                val r = validate(f.readBytes())
                assertIs<ValidationResult.Ok<*>>(r, r.toString())
                if (contract == "theme") {
                    assertEquals(if (f.name.startsWith("newer-minor")) ValidationMode.PRUNED else ValidationMode.STRICT, r.mode)
                }
            }
        }
        val invalid = Repo.fixtures(contract, "invalid").map { f ->
            DynamicTest.dynamicTest("$contract rejects ${f.name}") {
                val expected = ErrorCode.fromWire(f.name.substringBefore("--"))
                val r = validate(f.readBytes())
                assertIs<ValidationResult.Failed>(r, "expected $expected")
                assertEquals(expected, r.error.code, r.error.toString())
                assertTrue(r.error.problems.isNotEmpty())
            }
        }
        assertTrue(valid.isNotEmpty() && invalid.isNotEmpty(), "fixtures not found under ${Repo.root}")
        return valid + invalid
    }

    @TestFactory
    fun theme(): List<DynamicTest> = run("theme") { PrismTheme.validate(it) }

    @TestFactory
    fun themePack(): List<DynamicTest> = run("themepack") { PrismThemePack.validate(it) }

    private val default = Repo.file("contracts/testdata/theme/valid/default.json").readText()

    @Test
    fun sizeCaps() {
        val base = default.trimEnd().removeSuffix("}").trimEnd() + ",\"extensions2\":0}"
        assertEquals(ErrorCode.TOO_LARGE, (PrismTheme.validate(" ".repeat(4097)) as ValidationResult.Failed).error.code)
        assertEquals(ErrorCode.SCHEMA_VIOLATION, (PrismTheme.validate(base) as ValidationResult.Failed).error.code)
        val pad = default.replace("\"extensions\": {}", "\"extensions\": {\"milano\": {\"pad\": \"\"}}")
        val exact = pad.replace("\"pad\": \"\"", "\"pad\": \"" + "x".repeat(4096 - pad.toByteArray().size) + "\"")
        assertEquals(4096, exact.toByteArray().size)
        assertIs<ValidationResult.Ok<Theme>>(PrismTheme.validate(exact))
        assertEquals(ErrorCode.TOO_LARGE, (PrismTheme.validate("$exact ") as ValidationResult.Failed).error.code)
        val bigPack = "{\"schema\":\"knowhere.themepack\",\"pad\":\"" + "x".repeat(PrismThemePack.MAX_BYTES) + "\"}"
        assertEquals(ErrorCode.TOO_LARGE, (PrismThemePack.validate(bigPack) as ValidationResult.Failed).error.code)
    }

    @Test
    fun allowlistsAndTypedResult() {
        val t = PrismTheme.parse(default)
        assertEquals("#6750A4", t.seedColor)
        assertEquals(ColorSchemeName.DARK, t.colorScheme)
        val custom = default.replace("\"inter\"", "\"atkinson\"").replace("\"wallpaper\": null", "\"wallpaper\": {\"ref\": \"builtin:dunes\"}")
        assertIs<ValidationResult.Failed>(PrismTheme.validate(custom))
        val ok = PrismTheme.validate(custom, ValidateOptions(fonts = setOf("atkinson"), wallpapers = setOf("dunes")))
        assertEquals("dunes", (ok as ValidationResult.Ok).value.wallpaper?.key)
    }

    @Test
    fun problemsAreCapped() {
        val fields = (0 until 40).joinToString(",") { "\"f$it\":$it" }
        val r = PrismTheme.validate("{\"schema\":\"knowhere.theme\",\"schemaVersion\":\"0.1.0\",$fields}")
        assertEquals(MAX_PROBLEMS, (r as ValidationResult.Failed).error.problems.size)
    }
}
