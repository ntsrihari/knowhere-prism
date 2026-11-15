package dev.knowhere.prism

/** MAJOR.MINOR.PATCH contract version (rule R-17). */
public data class Version(val major: Int, val minor: Int, val patch: Int) {
    override fun toString(): String = "$major.$minor.$patch"

    public companion object {
        private val SEMVER = Regex("^(0|[1-9][0-9]{0,5})\\.(0|[1-9][0-9]{0,5})\\.(0|[1-9][0-9]{0,5})$")

        public fun parse(s: String?): Version? {
            val m = s?.let { SEMVER.matchEntire(it) } ?: return null
            return Version(m.groupValues[1].toInt(), m.groupValues[2].toInt(), m.groupValues[3].toInt())
        }
    }
}

/** Newest version Prism fully knows for a contract. */
public data class Support(val major: Int, val minor: Int) {
    /** Same MAJOR required; MINOR <= known: strict; newer MINOR: pruned. */
    public fun modeFor(v: Version): ValidationMode? = when {
        v.major != major -> null
        v.minor <= minor -> ValidationMode.STRICT
        else -> ValidationMode.PRUNED
    }
}
