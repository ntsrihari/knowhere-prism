package dev.knowhere.prism

import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class StrictJsonTest {
    @Test
    fun parses() {
        val v = StrictJson.parse(" [1, 12.0, -2.5e3, true, null, \"\\u00e9\\n\"] ").jsonArray
        assertEquals(JsonPrimitive(1L), v[0])
        assertEquals(JsonPrimitive(12L), v[1])
        assertEquals(JsonPrimitive(-2500L), v[2])
        assertEquals(JsonPrimitive("é\n"), v[5])
    }

    @ParameterizedTest
    @ValueSource(strings = ["{\"a\":1,\"a\":2}", "{} {}", "[1,]", "{'a':1}", "[01]", "yes", "", "\"\\x\"", "NaN", "\uFEFF{}", "1e400", "\"a\u0001\""])
    fun rejects(text: String) {
        assertFailsWith<JsonParseException> { StrictJson.parse(text) }
    }

    @Test
    fun depth() {
        val n = StrictJson.MAX_DEPTH + 1
        StrictJson.parse("[".repeat(n) + "]".repeat(n))
        assertFailsWith<JsonParseException> { StrictJson.parse("[".repeat(n + 1) + "]".repeat(n + 1)) }
    }
}
