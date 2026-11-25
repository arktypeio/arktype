package io.arktype.jetbrains

import java.io.File

/** The editor conformance suite (`ark/editor-conformance`) the tests check against. */
object Conformance {
	val dir: File = File(
		System.getProperty("ark.conformanceDir")
			?: error("Run the tests through Gradle, which sets ark.conformanceDir")
	).also { require(it.isDirectory) { "No editor conformance suite at $it" } }

	val corpus: File = dir.resolve("highlighting/corpus")
	val expected: File = dir.resolve("highlighting/expected")
	val diagnosticCases: File = dir.resolve("diagnostics/cases.json")

	/** every corpus file, by name */
	fun corpusFiles(): List<File> = corpus.listFiles().orEmpty().filter { it.isFile }.sortedBy { it.name }
}
