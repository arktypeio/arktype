package io.arktype.jetbrains.highlight

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import io.arktype.jetbrains.Conformance
import io.arktype.jetbrains.textmate.tokenize
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.TestFactory

/**
 * Every corpus file of the editor conformance suite highlights exactly as the
 * TextMate oracle (VS Code's own tokenizer) says: same spans, categories and
 * regions, character for character.
 */
class ConformanceHighlightingTest {
	private val highlights = ArkHighlights(Tokenizer { source, ext, ark -> tokenize(source, ext, ark) })

	@TestFactory
	fun corpus(): List<DynamicTest> {
		val files = Conformance.corpusFiles()
		assertTrue(files.isNotEmpty(), "the conformance corpus is empty")
		return files.map { file ->
			DynamicTest.dynamicTest(file.name) {
				val expected = JsonParser.parseString(Conformance.expected.resolve("${file.name}.json").readText()).asJsonObject
				val actual = highlights.compute(file.readText(), file.extension)
				assertEquals(render(expected.getAsJsonArray("spans").map { fromJson(it.asJsonObject) }), render(actual.spans))
			}
		}
	}

	private fun fromJson(span: JsonObject) = Span(
		line = span["line"].asInt,
		column = span["column"].asInt,
		length = span["length"].asInt,
		text = span["text"].asString,
		category = span["category"].asString,
		region = Region.entries.first { it.id == (span["region"]?.asString ?: "text") },
		baseCategory = span["baseCategory"]?.asString
	)

	/** one span per line, so a failure diffs like the fixture */
	private fun render(spans: List<Span>): String = spans.joinToString("\n") {
		"${it.line}:${it.column} ${it.text} ${it.region.id} ${it.category}" + (it.baseCategory?.let { base -> " (was $base)" } ?: "")
	}
}
