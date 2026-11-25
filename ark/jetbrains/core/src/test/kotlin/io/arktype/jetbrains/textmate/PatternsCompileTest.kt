package io.arktype.jetbrains.textmate

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.JsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Every pattern of every grammar we ship compiles with joni, in each of the
 * `\A`/`\G` variants vscode-textmate scans with. Oniguruma accepts them all
 * (VS Code runs them), so a failure here is a joni gap [LookbehindRewriter]
 * has to cover. End and while patterns with back-references are left out:
 * they only compile once the references are replaced by what they captured.
 */
class PatternsCompileTest {
	private fun resource(path: String) =
		javaClass.classLoader.getResourceAsStream("io/arktype/jetbrains/grammars/$path")!!.use {
			it.readBytes().toString(Charsets.UTF_8)
		}

	private fun collect(element: JsonElement, out: MutableSet<String>) {
		when (element) {
			is JsonArray -> element.forEach { collect(it, out) }
			is JsonObject ->
				for ((key, value) in element.entrySet()) {
					if (key in listOf("match", "begin", "end", "while") && value is JsonPrimitive) {
						val source = RegExpSource(value.asString, 0)
						if (key in listOf("end", "while") && source.hasBackReferences) continue
						for (allowA in listOf(false, true))
							for (allowG in listOf(false, true)) out += source.resolveAnchors(allowA, allowG)
					} else {
						collect(value, out)
					}
				}
			else -> {}
		}
	}

	@Test
	fun everyPatternCompiles() {
		val index = JsonParser.parseString(resource("index.json")).asJsonObject
		val patterns = LinkedHashSet<String>()
		for ((_, file) in index.getAsJsonObject("grammars").entrySet()) {
			collect(JsonParser.parseString(resource(file.asString)), patterns)
		}
		val failures =
			patterns.mapNotNull { pattern ->
				try {
					OnigPattern.get(pattern)
					null
				} catch (e: TextMateRegexException) {
					e.message
				}
			}
		assertEquals(emptyList<String>(), failures, "${failures.size} of ${patterns.size} patterns failed")
	}
}
