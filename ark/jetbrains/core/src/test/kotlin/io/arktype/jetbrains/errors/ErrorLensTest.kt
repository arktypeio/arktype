package io.arktype.jetbrains.errors

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The ErrorLens behaviors whose JavaScript semantics a naive Java port gets
 * wrong. Real TypeScript messages are covered by the conformance cases in
 * [ConformanceDiagnosticsTest].
 */
class ErrorLensTest {
	private val lens = ErrorLens()

	@Test
	fun `reads the five rules from the extension manifest`() {
		assertEquals(5, lens.config.replace.size)
		assertEquals(FollowCursor.CLOSEST_PROBLEM, lens.config.followCursor)
	}

	@Test
	fun `an ErrorType on a later line replaces the whole message`() {
		val message = "Argument of type '{ a: string; }' is not assignable to parameter of type 'never'.\n" +
			"  Type 'string' is not assignable to type 'ErrorType<\"must be a number\">'."
		assertEquals("must be a number", lens.replace(message))
	}

	@Test
	fun `dollar is the end of input, not the end of the last line`() {
		// Java's `$` also matches before a trailing newline, which would let the
		// brand rule match; in JavaScript only the last-line rule does
		val message = "Type 'x' is not assignable to type '{ \" brand\": \"ErrorType\"; must be a number }'.\n"
		assertEquals("", lens.replace(message))
		assertEquals("must be a number", lens.replace(message.trimEnd('\n')))
	}

	@Test
	fun `a completion backreference matches case-insensitively`() {
		val message = "Argument of type '\"STRIN\"' is not assignable to parameter of type '\"string\"'."
		assertEquals("\"string\"", lens.replace(message))
	}

	@Test
	fun `a zero-width completion keeps the quoted text`() {
		val message = "Argument of type '\"string |\"' is not assignable to parameter of type '\"string | number \"'."
		assertEquals("string | number ", lens.replace(message))
	}

	@Test
	fun `a multiline message keeps its last line`() {
		assertEquals("    Type 'number' is not assignable to type 'string'.", lens.replace("a\n  b\n    Type 'number' is not assignable to type 'string'."))
	}

	@Test
	fun `a message no rule matches passes through`() {
		assertEquals("Cannot find name 'foo'.", lens.replace("Cannot find name 'foo'."))
	}

	@Test
	fun `replacement patterns in captured text expand as in JavaScript`() {
		// "$1".replace(/\$1/gu, "costs $& more") yields "costs $1 more"
		assertEquals("costs \$1 more", lens.replace("Type 'x' is not assignable to type 'ErrorType<\"costs \$& more\">'."))
	}

	@Test
	fun `a group that didn't participate is undefined`() {
		val lens = ErrorLens(ErrorLensConfig(listOf(ReplaceRule("a(b)?", "[\$1]"))))
		assertEquals("[undefined]", lens.replace("a"))
	}

	@Test
	fun `only the first matching rule applies`() {
		val lens = ErrorLens(ErrorLensConfig(listOf(ReplaceRule("a", "b"), ReplaceRule("b", "c"))))
		assertEquals("b", lens.replace("a"))
	}

	@Test
	fun `inline messages collapse runs of linebreaks and tabs`() {
		val lens = ErrorLens(ErrorLensConfig(emptyList()))
		assertEquals("a⏎b⏎c", lens.inlineMessage("a\r\n\tb\nc"))
	}

	@Test
	fun `inline messages are cut at 500 code points`() {
		val lens = ErrorLens(ErrorLensConfig(emptyList()))
		val emoji = "🚀"
		assertEquals(emoji.repeat(500), lens.inlineMessage(emoji.repeat(500)))
		assertEquals(emoji.repeat(500) + "…", lens.inlineMessage(emoji.repeat(501)))
	}

	@Test
	fun `JavaScript regex classes and dots translate`() {
		assertTrue(JsRegex.compile("^[^]$").matcher("\n").find())
		assertFalse(JsRegex.compile("[]").matcher("]").find())
		assertTrue(JsRegex.compile("^.$").matcher("\u0085").find())
		assertFalse(JsRegex.compile("^.$").matcher(" ").find())
		assertTrue(JsRegex.compile("^[[]$").matcher("[").find())
		assertTrue(JsRegex.compile("^\\s$").matcher("﻿").find())
	}
}
