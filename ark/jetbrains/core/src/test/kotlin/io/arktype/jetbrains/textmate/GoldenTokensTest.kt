package io.arktype.jetbrains.textmate

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.TestFactory
import java.io.File

/**
 * The engine's tokens for the extension's scratch file and the Vue, Svelte,
 * Astro, Markdown and MDX samples equal vscode-textmate's, with and without
 * the ArkType injection. The goldens are the oracle's output, written by
 * `scripts/writeGoldens.ts`; `scripts/diffEngine.ts` compares the whole repo.
 */
class GoldenTokensTest {
	private val repoRoot = File(System.getProperty("ark.repoRoot") ?: error("ark.repoRoot is unset"))
	private val goldenDir = File(repoRoot, "ark/jetbrains/core/src/test/resources/golden")

	/** A line's tokens as `start-end scopes`, so a failure shows the line that differs. */
	private fun describe(start: Int, end: Int, scopes: List<String>) = "$start-$end ${scopes.joinToString(" ")}"

	@TestFactory
	fun matchesOracle(): List<DynamicTest> {
		val goldens = goldenDir.listFiles { file -> file.name.endsWith(".jsonl") }?.sortedBy { it.name }.orEmpty()
		check(goldens.isNotEmpty()) { "No goldens in $goldenDir; run scripts/writeGoldens.ts" }
		return goldens.flatMap { file ->
			val golden = JsonParser.parseString(file.readText()).asJsonObject
			val source = golden.get("source").asString
			golden.getAsJsonArray("variants").map { element ->
				val variant = element.asJsonObject
				val ark = variant.get("ark").asBoolean
				DynamicTest.dynamicTest("$source${if (ark) "" else " (no ark)"}") {
					val text = File(repoRoot, source).readText()
					val actual = tokenize(text, source.substringAfterLast('.'), ark)
					val expected = expectedLines(variant)
					assertEquals(expected.size, actual.size, "line count")
					for ((i, line) in expected.withIndex()) {
						assertEquals(
							line.joinToString("\n"),
							actual[i].joinToString("\n") { describe(it.start, it.end, it.scopes) },
							"$source:${i + 1}"
						)
					}
				}
			}
		}
	}

	private fun expectedLines(variant: JsonObject): List<List<String>> {
		val scopes = variant.getAsJsonArray("scopes").map { list -> list.asJsonArray.map { it.asString } }
		return variant.getAsJsonArray("lines").map { line ->
			line.asJsonArray.map { token ->
				val (start, end, index) = token.asJsonArray.map { it.asInt }
				describe(start, end, scopes[index])
			}
		}
	}
}
