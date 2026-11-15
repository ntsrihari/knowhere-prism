package dev.knowhere.prism

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.longOrNull

/** Hand-written structural checks mirroring contracts/ JSON Schemas (same as prism-web check.ts). */
internal class Problems {
    val list = ArrayList<String>()
    fun add(path: String, msg: String) {
        if (list.size < MAX_PROBLEMS) list.add("${path.ifEmpty { "/" }}: $msg")
    }
    val empty: Boolean get() = list.isEmpty()
}

internal fun ptr(path: String, key: Any): String = "$path/" + key.toString().replace("~", "~0").replace("/", "~1")

internal typealias FieldCheck = (JsonElement, String, Problems) -> Unit

internal fun JsonElement.stringValue(): String? = (this as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun JsonElement.isNumber(): Boolean =
    this is JsonPrimitive && !isString && this !is JsonNull && booleanOrNull == null && doubleOrNull != null

private fun JsonElement.integerValue(): Long? = if (isNumber()) (this as JsonPrimitive).longOrNull else null

internal fun checkObject(v: JsonElement, path: String, p: Problems, fields: Map<String, FieldCheck>, required: List<String>): Boolean {
    if (v !is JsonObject) {
        p.add(path, "must be an object")
        return false
    }
    for (r in required) if (!v.containsKey(r)) p.add(path, "missing required field \"$r\"")
    for (k in v.keys.sorted()) {
        val check = fields[k]
        if (check == null) p.add(ptr(path, k), "unknown field") else check(v.getValue(k), ptr(path, k), p)
    }
    return true
}

internal fun constString(c: String): FieldCheck = { v, path, p -> if (v.stringValue() != c) p.add(path, "must be \"$c\"") }

internal fun patternString(re: Regex, what: String): FieldCheck = { v, path, p ->
    val s = v.stringValue()
    if (s == null) p.add(path, "must be a string") else if (!re.matches(s)) p.add(path, "must be $what")
}

internal fun lengthString(min: Int, max: Int): FieldCheck = { v, path, p ->
    val s = v.stringValue()
    if (s == null) {
        p.add(path, "must be a string")
    } else {
        val n = s.codePointCount(0, s.length)
        if (n < min || n > max) p.add(path, "length must be $min-$max characters")
    }
}

internal fun enumOf(values: List<String>): FieldCheck = { v, path, p ->
    if (v.stringValue() !in values) p.add(path, "must be one of ${values.joinToString(", ")}")
}

internal fun intRange(min: Long, max: Long): FieldCheck = { v, path, p ->
    val n = v.integerValue()
    if (n == null) p.add(path, "must be an integer") else if (n < min || n > max) p.add(path, "must be between $min and $max")
}

internal fun arrayOf(item: FieldCheck, min: Int, max: Int): FieldCheck = { v, path, p ->
    if (v !is JsonArray) {
        p.add(path, "must be an array")
    } else {
        if (v.size < min || v.size > max) p.add(path, "must have $min-$max items")
        v.forEachIndexed { i, x -> item(x, ptr(path, i), p) }
    }
}

/** Known exact-case fields for pruning newer-MINOR documents (null value: keep as-is). */
internal class FieldSet(val fields: Map<String, FieldSet?>, val items: FieldSet? = null)

internal fun prune(v: JsonElement, fs: FieldSet?): JsonElement {
    if (fs == null) return v
    return when (v) {
        is JsonArray -> if (fs.items != null) JsonArray(v.map { prune(it, fs.items) }) else v
        is JsonObject -> JsonObject(v.filterKeys { it in fs.fields }.mapValues { (k, x) -> prune(x, fs.fields[k]) })
        else -> v
    }
}
