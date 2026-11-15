package dev.knowhere.prism

import java.io.File

internal object Repo {
    val root: File = File(System.getProperty("prism.repoRoot") ?: "..").absoluteFile
    fun file(path: String): File = File(root, path)
    fun fixtures(contract: String, kind: String): List<File> =
        (file("contracts/testdata/$contract/$kind").listFiles() ?: emptyArray()).filter { it.name.endsWith(".json") }.sortedBy { it.name }
}
