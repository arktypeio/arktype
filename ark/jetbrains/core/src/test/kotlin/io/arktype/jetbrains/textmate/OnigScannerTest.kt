package io.arktype.jetbrains.textmate

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Where joni and Oniguruma 6.9.8 differ, the scanner still answers as
 * vscode-oniguruma does. Each expected result was read from
 * `@shikijs/engine-oniguruma` searching the same pattern and string.
 */
class OnigScannerTest {
	/** The first match as `start-end` per group, `x` for one that didn't participate. */
	private fun search(pattern: String, string: String, position: Int = 0): String? {
		val match = OnigScanner(listOf(pattern)).findNextMatch(OnigString(string), position) ?: return null
		return match.captureIndices.joinToString(" ") { if (it.start < 0) "x" else "${it.start}-${it.end}" }
	}

	@Test
	fun lookbehindOfDifferentLengthsWithGroup() =
		assertEquals("3-4 0-2", search("(?<=(use|in):)a", "in:abc\n"))

	@Test
	fun lookbehindWithNestedAlternation() {
		val pattern = "(?<!(?:^|[^$._[:alnum:]])import)(?=;|$|^)"
		assertEquals("8-8", search(pattern, "x.import;\n", 1))
		assertEquals("9-9", search(pattern, "y import;\n", 1))
	}

	@Test
	fun lookbehindWithBoundedRepeatGroupAndOptions() =
		assertEquals("2-2 0-1", search("(?i)(?<=^|(^|[^:])\\s|[;{}]|\\*/|\\\\(?:\\h{1,6}|.))(?=a)", "x a\n"))

	@Test
	fun unboundedLookbehindTakesNearestStart() =
		assertEquals("8-8 3-6", search("(?<=(if|key).*?)\\G", "if key x\n", 8))

	@Test
	fun unboundedLookbehindNotLeadingIsCutOff() =
		assertEquals(
			"14-14",
			search("(?<!(?:^|[^$._[:alnum:]]|^await\\s+|[^$._[:alnum:]]await\\s+)using)(?=\\s*$)", "await   using\n")
		)

	@Test
	fun backReferenceInLookbehind() =
		assertEquals(
			"4-10 4-6 6-8 8-10",
			search(
				"(?<!\\\\)(~{2,})(?!(?<=\\w~~)_)((?:[^~]|(?!(?<![\\\\~])\\1(?!~))~)*+)(\\1)(?!(?<=_\\1)\\w)",
				"~~a_~~b ~~c~~\n"
			)
		)

	/** RegSet search tries a pattern led by `.*` only where a line starts, even after a look-behind. */
	@Test
	fun leadingAnycharStarOnlyAtLineStarts() {
		assertEquals(null, search("(?<=:).*$", "in:abc\n"))
		assertEquals("3-6", search("(?<=:).*$", "in:abc\n", 3))
	}

	@Test
	fun wordClassIsUnicode() = assertEquals("1-2", search("[^ \\w]", "ß!\n"))

	@Test
	fun superDot() = assertEquals("0-1", search("\\N+?", "ab\n"))
}
