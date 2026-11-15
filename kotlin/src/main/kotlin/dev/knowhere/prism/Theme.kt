package dev.knowhere.prism

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement

@Serializable
public enum class ColorSchemeName {
    @SerialName("light") LIGHT,
    @SerialName("dark") DARK,
}

@Serializable
public enum class Density {
    @SerialName("comfortable") COMFORTABLE,
    @SerialName("compact") COMPACT,
}

@Serializable
public data class Wallpaper(val ref: String) {
    /** The built-in key ("builtin:aurora" -> "aurora"). */
    val key: String get() = ref.removePrefix("builtin:")
}

/** A validated knowhere.theme 0.1 document (unknown newer-minor fields removed). */
@Serializable
public data class Theme(
    val schema: String,
    val schemaVersion: String,
    val name: String? = null,
    val seedColor: String,
    val colorScheme: ColorSchemeName,
    val cornerRadius: Int,
    val font: String,
    val density: Density,
    val wallpaper: Wallpaper? = null,
    val extensions: Map<String, JsonObject> = emptyMap(),
)

/** Server/app context for semantic (invalid_value) checks. */
public data class ValidateOptions(
    val fonts: Set<String> = PrismTheme.BUNDLED_FONTS,
    /** Built-in wallpaper keys without "builtin:"; none by default, as in Nexus M1. */
    val wallpapers: Set<String> = emptySet(),
)

internal val decoder = Json { ignoreUnknownKeys = false; explicitNulls = false }

public object PrismTheme {
    public const val SCHEMA: String = "knowhere.theme"
    public val SUPPORT: Support = Support(0, 1)
    public const val MAX_BYTES: Int = 4 * 1024
    public val BUNDLED_FONTS: Set<String> = linkedSetOf("inter", "roboto", "roboto-flex", "jetbrains-mono")

    internal val FIELDS = FieldSet(
        mapOf(
            "schema" to null, "schemaVersion" to null, "name" to null, "seedColor" to null, "colorScheme" to null,
            "cornerRadius" to null, "font" to null, "density" to null, "wallpaper" to FieldSet(mapOf("ref" to null)),
            "extensions" to null,
        ),
    )
    private val REQUIRED = listOf("schema", "schemaVersion", "seedColor", "colorScheme", "cornerRadius", "font", "density")

    private val wallpaperCheck: FieldCheck = { v, path, p ->
        when (v) {
            is JsonNull -> Unit
            is JsonObject -> checkObject(v, path, p, mapOf("ref" to patternString(Regex("^builtin:[a-z0-9][a-z0-9-]{0,39}$"), "a \"builtin:<key>\" reference")), listOf("ref"))
            else -> p.add(path, "must be null or an object")
        }
    }

    private val NAMESPACE = Regex("^[a-z][a-z0-9-]{0,31}$")
    private val extensionsCheck: FieldCheck = { v, path, p ->
        if (v !is JsonObject) {
            p.add(path, "must be an object")
        } else {
            if (v.size > 16) p.add(path, "must have at most 16 namespaces")
            for (k in v.keys.sorted()) {
                if (!NAMESPACE.matches(k)) p.add(ptr(path, k), "namespace must match ^[a-z][a-z0-9-]{0,31}$")
                if (v.getValue(k) !is JsonObject) p.add(ptr(path, k), "must be an object")
            }
        }
    }

    private val CHECKS: Map<String, FieldCheck> = mapOf(
        "schema" to constString(SCHEMA),
        "schemaVersion" to patternString(Regex("^0\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$"), "a 0.MINOR.PATCH version"),
        "name" to lengthString(1, 40),
        "seedColor" to patternString(Regex("^#[0-9A-Fa-f]{6}$"), "a #RRGGBB colour"),
        "colorScheme" to enumOf(listOf("light", "dark")),
        "cornerRadius" to intRange(0, 32),
        "font" to patternString(Regex("^[a-z0-9][a-z0-9-]{0,39}$"), "a font key"),
        "density" to enumOf(listOf("comfortable", "compact")),
        "wallpaper" to wallpaperCheck,
        "extensions" to extensionsCheck,
    )

    internal val structure: FieldCheck = { v, path, p -> checkObject(v, path, p, CHECKS, REQUIRED) }

    internal fun checkValues(t: Theme, path: String, p: Problems, fonts: Set<String>, wallpapers: Set<String>) {
        if (t.font !in fonts) p.add(ptr(path, "font"), "\"${t.font}\" is not a bundled font")
        val w = t.wallpaper
        if (w != null && w.key !in wallpapers) p.add(ptr(ptr(path, "wallpaper"), "ref"), "\"${w.ref}\" is not a built-in wallpaper")
    }

    /** Validates raw UTF-8 bytes of a knowhere.theme document. */
    public fun validate(bytes: ByteArray, opts: ValidateOptions = ValidateOptions()): ValidationResult<Theme> {
        val dec = decode(bytes, MAX_BYTES, "theme")
        if (dec is ValidationResult.Failed) return dec
        val doc = (dec as ValidationResult.Ok).value
        val g = gate(doc, SCHEMA, SUPPORT, "")
        if (g is ValidationResult.Failed) return g
        val mode = (g as ValidationResult.Ok).value
        val value = if (mode == ValidationMode.PRUNED) prune(doc, FIELDS) else doc
        val p = Problems()
        structure(value, "", p)
        if (!p.empty) return fail(ErrorCode.SCHEMA_VIOLATION, p.list)
        val theme = decoder.decodeFromJsonElement<Theme>(value)
        checkValues(theme, "", p, opts.fonts, opts.wallpapers)
        if (!p.empty) return fail(ErrorCode.INVALID_VALUE, p.list)
        return ValidationResult.Ok(theme, mode)
    }

    public fun validate(text: String, opts: ValidateOptions = ValidateOptions()): ValidationResult<Theme> =
        validate(text.toByteArray(Charsets.UTF_8), opts)

    /** Validates and returns the theme, or throws [PrismValidationException]. */
    public fun parse(text: String, opts: ValidateOptions = ValidateOptions()): Theme = validate(text, opts).getOrThrow()
}

internal fun decode(bytes: ByteArray, maxBytes: Int, what: String): ValidationResult<JsonElement> {
    if (bytes.size > maxBytes) return fail(ErrorCode.TOO_LARGE, "$what exceeds $maxBytes bytes")
    val text = try {
        Charsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes)).toString()
    } catch (e: java.nio.charset.CharacterCodingException) {
        return fail(ErrorCode.INVALID_DOCUMENT, "document is not valid UTF-8")
    }
    return try {
        ValidationResult.Ok(StrictJson.parse(text), ValidationMode.STRICT)
    } catch (e: JsonParseException) {
        fail(ErrorCode.INVALID_DOCUMENT, e.message ?: "invalid JSON")
    }
}

/** Schema name, then version gate (R-17). The Ok value is the validation mode. */
internal fun gate(v: JsonElement, schemaName: String, sup: Support, path: String): ValidationResult<ValidationMode> {
    if (v !is JsonObject) return fail(ErrorCode.INVALID_DOCUMENT, "${path.ifEmpty { "/" }}: document must be an object")
    if (v["schema"]?.stringValue() != schemaName) return fail(ErrorCode.WRONG_SCHEMA, "${ptr(path, "schema")}: schema must be \"$schemaName\"")
    val ver = Version.parse(v["schemaVersion"]?.stringValue())
        ?: return fail(ErrorCode.UNSUPPORTED_SCHEMA_VERSION, "${ptr(path, "schemaVersion")}: schemaVersion must be MAJOR.MINOR.PATCH")
    val mode = sup.modeFor(ver)
        ?: return fail(ErrorCode.UNSUPPORTED_SCHEMA_VERSION, "${ptr(path, "schemaVersion")}: schemaVersion $ver is not supported (supported major version ${sup.major})")
    return ValidationResult.Ok(mode, mode)
}
