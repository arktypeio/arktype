package io.arktype.jetbrains

import io.arktype.jetbrains.errors.ErrorLens
import io.arktype.jetbrains.errors.ErrorLensConfig
import io.arktype.jetbrains.errors.FollowCursor
import io.arktype.jetbrains.errors.InlineMessage
import io.arktype.jetbrains.errors.Problem
import io.arktype.jetbrains.errors.Severity
import io.arktype.jetbrains.errors.diagnosticMessage
import io.arktype.jetbrains.errors.inlineMessages
import io.arktype.jetbrains.imports.AutoImportSpecifierFilter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Which problems ErrorLens shows inline (`errorLens.followCursor`), and how messages reach it. */
class InlineMessagesTest {
	private val closest = ErrorLens(ErrorLensConfig.extension)

	private val problems = listOf(
		Problem(2, Severity.WARNING, "unused"),
		Problem(2, Severity.ERROR, "Cannot find name 'x'."),
		Problem(6, Severity.INFO, "info")
	)

	@Test
	fun `closestProblem shows the nearest line's most severe problem`() {
		assertEquals(listOf(InlineMessage(2, Severity.ERROR, "Cannot find name 'x'.")), inlineMessages(problems, 3, closest))
		assertEquals(listOf(InlineMessage(6, Severity.INFO, "info")), inlineMessages(problems, 5, closest))
	}

	@Test
	fun `closestProblem breaks a tie toward the line above`() {
		assertEquals(2, inlineMessages(problems, 4, closest).single().line)
	}

	@Test
	fun `allLines shows every line`() {
		val all = ErrorLens(ErrorLensConfig.extension.copy(followCursor = FollowCursor.ALL_LINES))
		assertEquals(listOf(2, 6), inlineMessages(problems, 0, all).map { it.line })
	}

	@Test
	fun `messages are rewritten without the IDE's TS code`() {
		val message = diagnosticMessage("TS2322: Type 'string' is not assignable to type 'ErrorType<\"must be a number\">'.")
		assertEquals("must be a number", inlineMessages(listOf(Problem(0, Severity.ERROR, message)), 0, closest).single().text)
	}

	@Test
	fun `auto-import exclusions read as TypeScript reads them`() {
		val os = AutoImportSpecifierFilter.compile("^(node:)?os$")!!
		assertTrue(os.matcher("node:os").find())
		assertTrue(os.matcher("os").find())
		assertFalse(os.matcher("node:os/promises").find())
		assertTrue(AutoImportSpecifierFilter.compile("/^LODASH/i")!!.matcher("lodash").find())
		assertNull(AutoImportSpecifierFilter.compile("("))
	}
}
