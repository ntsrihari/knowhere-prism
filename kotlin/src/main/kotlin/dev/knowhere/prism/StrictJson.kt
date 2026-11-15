package dev.knowhere.prism

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.math.BigDecimal

public class JsonParseException(message: String) : IllegalArgumentException(message)

/**
 * Strict JSON decoding: one RFC 8259 value, no duplicate keys, depth <= [MAX_DEPTH],
 * no trailing data. Integral numbers (including "12.0") become Long primitives.
 * Mirrors knowhere-nexus strictjson.go and prism-web json.ts.
 */
public object StrictJson {
    public const val MAX_DEPTH: Int = 32
    private val NUMBER = Regex("-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?")

    public fun parse(text: String): JsonElement {
        val p = Parser(text)
        val v = p.value(0)
        p.ws()
        if (p.i != text.length) throw JsonParseException("unexpected data after JSON value")
        return v
    }

    private class Parser(val s: String) {
        var i = 0

        fun fail(msg: String): Nothing = throw JsonParseException("invalid JSON at offset $i: $msg")

        fun ws() {
            while (i < s.length && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r')) i++
        }

        fun value(depth: Int): JsonElement {
            if (depth > MAX_DEPTH) throw JsonParseException("JSON nesting too deep")
            ws()
            if (i >= s.length) fail("unexpected end of input")
            return when (s[i]) {
                '{' -> obj(depth)
                '[' -> arr(depth)
                '"' -> JsonPrimitive(str())
                else -> when {
                    s.startsWith("true", i) -> { i += 4; JsonPrimitive(true) }
                    s.startsWith("false", i) -> { i += 5; JsonPrimitive(false) }
                    s.startsWith("null", i) -> { i += 4; JsonNull }
                    else -> number()
                }
            }
        }

        fun number(): JsonElement {
            val m = NUMBER.matchAt(s, i) ?: fail("unexpected character")
            i += m.value.length
            val bd = BigDecimal(m.value)
            val d = bd.toDouble()
            if (d.isInfinite()) fail("number out of range")
            val integral = bd.signum() == 0 || bd.stripTrailingZeros().scale() <= 0
            if (integral && d >= Long.MIN_VALUE.toDouble() && d <= Long.MAX_VALUE.toDouble()) return JsonPrimitive(bd.toLong())
            return JsonPrimitive(d)
        }

        fun obj(depth: Int): JsonElement {
            i++
            val m = LinkedHashMap<String, JsonElement>()
            ws()
            if (i < s.length && s[i] == '}') { i++; return JsonObject(m) }
            while (true) {
                ws()
                if (i >= s.length || s[i] != '"') fail("expected object key")
                val k = str()
                if (m.containsKey(k)) throw JsonParseException("duplicate key \"$k\"")
                ws()
                if (i >= s.length || s[i] != ':') fail("expected \":\"")
                i++
                m[k] = value(depth + 1)
                ws()
                if (i < s.length && s[i] == ',') { i++; continue }
                if (i < s.length && s[i] == '}') { i++; return JsonObject(m) }
                fail("expected \",\" or \"}\"")
            }
        }

        fun arr(depth: Int): JsonElement {
            i++
            val a = ArrayList<JsonElement>()
            ws()
            if (i < s.length && s[i] == ']') { i++; return JsonArray(a) }
            while (true) {
                a.add(value(depth + 1))
                ws()
                if (i < s.length && s[i] == ',') { i++; continue }
                if (i < s.length && s[i] == ']') { i++; return JsonArray(a) }
                fail("expected \",\" or \"]\"")
            }
        }

        fun str(): String {
            i++
            val sb = StringBuilder()
            while (true) {
                if (i >= s.length) fail("unterminated string")
                val c = s[i]
                when {
                    c == '"' -> { i++; return sb.toString() }
                    c < ' ' -> fail("control character in string")
                    c == '\\' -> {
                        i++
                        if (i >= s.length) fail("bad escape")
                        when (s[i]) {
                            '"' -> sb.append('"'); '\\' -> sb.append('\\'); '/' -> sb.append('/')
                            'b' -> sb.append('\b'); 'f' -> sb.append('\u000C'); 'n' -> sb.append('\n')
                            'r' -> sb.append('\r'); 't' -> sb.append('\t')
                            'u' -> {
                                val hex = s.substring(i + 1, minOf(i + 5, s.length))
                                if (hex.length != 4 || !hex.all { it in '0'..'9' || it in 'a'..'f' || it in 'A'..'F' }) fail("bad unicode escape")
                                sb.append(hex.toInt(16).toChar())
                                i += 4
                            }
                            else -> fail("bad escape")
                        }
                        i++
                    }
                    else -> { sb.append(c); i++ }
                }
            }
        }
    }
}
