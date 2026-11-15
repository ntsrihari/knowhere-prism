package dev.knowhere.prism

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement

@Serializable
public data class WallpaperMeta(
    val key: String,
    val name: String,
    val mediaType: String,
    val width: Int,
    val height: Int,
    val sha256: String,
    val dominantColor: String? = null,
)

/** A validated knowhere.themepack 0.1 document. */
@Serializable
public data class ThemePack(
    val schema: String,
    val schemaVersion: String,
    val id: String,
    val name: String,
    val version: String,
    val themes: List<Theme>,
    val wallpapers: List<WallpaperMeta> = emptyList(),
)

public object PrismThemePack {
    public const val SCHEMA: String = "knowhere.themepack"
    public val SUPPORT: Support = Support(0, 1)
    public const val MAX_BYTES: Int = 256 * 1024

    private val WALLPAPER_FIELDS = FieldSet(listOf("key", "name", "mediaType", "width", "height", "sha256", "dominantColor").associateWith { null })
    internal val FIELDS = FieldSet(
        mapOf(
            "schema" to null, "schemaVersion" to null, "id" to null, "name" to null, "version" to null, "themes" to null,
            "wallpapers" to FieldSet(emptyMap(), items = WALLPAPER_FIELDS),
        ),
    )

    private val wallpaperCheck: FieldCheck = { v, path, p ->
        checkObject(
            v, path, p,
            mapOf(
                "key" to patternString(Regex("^[a-z0-9][a-z0-9-]{0,39}$"), "a wallpaper key"),
                "name" to lengthString(1, 40),
                "mediaType" to enumOf(listOf("image/webp", "image/png", "image/jpeg", "image/avif")),
                "width" to intRange(1, 16384),
                "height" to intRange(1, 16384),
                "sha256" to patternString(Regex("^[0-9a-f]{64}$"), "64 lowercase hex digits"),
                "dominantColor" to patternString(Regex("^#[0-9A-Fa-f]{6}$"), "a #RRGGBB colour"),
            ),
            listOf("key", "name", "mediaType", "width", "height", "sha256"),
        )
    }

    private val CHECKS: Map<String, FieldCheck> = mapOf(
        "schema" to constString(SCHEMA),
        "schemaVersion" to patternString(Regex("^0\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$"), "a 0.MINOR.PATCH version"),
        "id" to patternString(Regex("^[a-z][a-z0-9-]{1,39}$"), "a pack id (^[a-z][a-z0-9-]{1,39}$)"),
        "name" to lengthString(1, 40),
        "version" to patternString(Regex("^(0|[1-9][0-9]{0,5})\\.(0|[1-9][0-9]{0,5})\\.(0|[1-9][0-9]{0,5})$"), "MAJOR.MINOR.PATCH"),
        "themes" to arrayOf(PrismTheme.structure, 1, 64),
        "wallpapers" to arrayOf(wallpaperCheck, 0, 64),
    )
    private val REQUIRED = listOf("schema", "schemaVersion", "id", "name", "version", "themes")

    /** Validates raw UTF-8 bytes; R-17 applies to the pack and independently to each theme. */
    public fun validate(bytes: ByteArray, opts: ValidateOptions = ValidateOptions()): ValidationResult<ThemePack> {
        val dec = decode(bytes, MAX_BYTES, "theme pack")
        if (dec is ValidationResult.Failed) return dec
        val doc = (dec as ValidationResult.Ok).value
        val g = gate(doc, SCHEMA, SUPPORT, "")
        if (g is ValidationResult.Failed) return g
        val mode = (g as ValidationResult.Ok).value
        var value: JsonElement = if (mode == ValidationMode.PRUNED) prune(doc, FIELDS) else doc

        val obj = value as JsonObject
        val themes = obj["themes"]
        if (themes is JsonArray) {
            val out = ArrayList<JsonElement>()
            themes.forEachIndexed { i, t ->
                val path = ptr("/themes", i)
                if (t !is JsonObject) {
                    out.add(t)
                } else {
                    if (t.toString().toByteArray(Charsets.UTF_8).size > PrismTheme.MAX_BYTES) {
                        return fail(ErrorCode.TOO_LARGE, "$path: theme exceeds ${PrismTheme.MAX_BYTES} bytes")
                    }
                    val tg = gate(t, PrismTheme.SCHEMA, PrismTheme.SUPPORT, path)
                    if (tg is ValidationResult.Failed) return tg
                    out.add(if ((tg as ValidationResult.Ok).value == ValidationMode.PRUNED) prune(t, PrismTheme.FIELDS) else t)
                }
            }
            value = JsonObject(obj + ("themes" to JsonArray(out)))
        }

        val p = Problems()
        checkObject(value, "", p, CHECKS, REQUIRED)
        if (!p.empty) return fail(ErrorCode.SCHEMA_VIOLATION, p.list)
        val pack = decoder.decodeFromJsonElement<ThemePack>(value)

        val keys = LinkedHashSet<String>()
        pack.wallpapers.forEachIndexed { i, w ->
            if (!keys.add(w.key)) p.add(ptr(ptr("/wallpapers", i), "key"), "duplicate wallpaper key \"${w.key}\"")
        }
        val known = opts.wallpapers + keys
        val names = HashSet<String>()
        pack.themes.forEachIndexed { i, t ->
            val path = ptr("/themes", i)
            if (t.name == null) {
                p.add(path, "a theme in a pack must have a name")
            } else if (!names.add(t.name.lowercase())) {
                p.add(ptr(path, "name"), "duplicate theme name \"${t.name}\"")
            }
            PrismTheme.checkValues(t, path, p, opts.fonts, known)
        }
        if (!p.empty) return fail(ErrorCode.INVALID_VALUE, p.list)
        return ValidationResult.Ok(pack, mode)
    }

    public fun validate(text: String, opts: ValidateOptions = ValidateOptions()): ValidationResult<ThemePack> =
        validate(text.toByteArray(Charsets.UTF_8), opts)

    public fun parse(text: String, opts: ValidateOptions = ValidateOptions()): ThemePack = validate(text, opts).getOrThrow()
}
