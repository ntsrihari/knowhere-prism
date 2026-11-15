package dev.knowhere.prism

/** Error codes shared with knowhere-nexus and prism-web. */
public enum class ErrorCode(public val wire: String) {
    TOO_LARGE("too_large"),
    INVALID_DOCUMENT("invalid_document"),
    WRONG_SCHEMA("wrong_schema"),
    UNSUPPORTED_SCHEMA_VERSION("unsupported_schema_version"),
    SCHEMA_VIOLATION("schema_violation"),
    INVALID_VALUE("invalid_value");

    override fun toString(): String = wire

    public companion object {
        public fun fromWire(s: String): ErrorCode? = entries.firstOrNull { it.wire == s }
    }
}

public const val MAX_PROBLEMS: Int = 20

public data class PrismError(val code: ErrorCode, val problems: List<String>) {
    override fun toString(): String = if (problems.isEmpty()) code.wire else "${code.wire}: ${problems.joinToString("; ")}"
}

public class PrismValidationException(public val error: PrismError) : IllegalArgumentException(error.toString())

/** strict: a version Prism fully knows; pruned: a newer MINOR with unknown fields removed. */
public enum class ValidationMode { STRICT, PRUNED }

public sealed interface ValidationResult<out T> {
    public data class Ok<T>(val value: T, val mode: ValidationMode) : ValidationResult<T>
    public data class Failed(val error: PrismError) : ValidationResult<Nothing>

    public fun getOrThrow(): T = when (this) {
        is Ok -> value
        is Failed -> throw PrismValidationException(error)
    }
}

internal fun fail(code: ErrorCode, vararg problems: String): ValidationResult.Failed =
    ValidationResult.Failed(PrismError(code, problems.take(MAX_PROBLEMS)))

internal fun fail(code: ErrorCode, problems: List<String>): ValidationResult.Failed =
    ValidationResult.Failed(PrismError(code, problems.take(MAX_PROBLEMS)))
