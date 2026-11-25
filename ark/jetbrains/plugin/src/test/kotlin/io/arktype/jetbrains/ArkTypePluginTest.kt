package io.arktype.jetbrains

import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.lang.javascript.psi.JSLiteralExpression
import com.intellij.openapi.components.service
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import io.arktype.jetbrains.completion.ArkTypeCompletionConfidence
import io.arktype.jetbrains.errors.InlineErrorRenderer
import io.arktype.jetbrains.errors.InlineErrors
import io.arktype.jetbrains.highlight.ArkTypeColors

/** The plugin's IDE wiring, driven through a real editor. */
class ArkTypePluginTest : BasePlatformTestCase() {
	/** each recolored range in the current file as `text:category` */
	private fun recolored(): List<String> {
		val text = myFixture.editor.document.text
		val categories = ArkTypeColors.keys.entries.associate { (category, key) -> key to category }
		return myFixture.doHighlighting()
			.filter { it.forcedTextAttributesKey in categories }
			.sortedBy { it.startOffset }
			.map { text.substring(it.startOffset, it.endOffset) + ":" + categories.getValue(it.forcedTextAttributesKey) }
	}

	fun `test a definition's strings are recolored`() {
		myFixture.configureByText("user.ts", "const User = type({ name: \"string | number[]\", age: \"0 < number <= 120\" })\n")
		assertEquals(
			listOf(
				"string:type.builtin", "|:operator", "number:type.builtin", "[]:operator",
				"0:number", "<:operator", "number:type.builtin", "<=:operator", "120:number"
			),
			recolored()
		)
	}

	fun `test strings outside definitions keep the IDE's colors`() {
		myFixture.configureByText("plain.ts", "const factor = (s: string) => s\nfactor(\"foo|bar\")\nhasArkKind(\"foo[]\")\n")
		assertEmpty(recolored())
	}

	fun `test definitions in a Markdown fence are recolored`() {
		myFixture.configureByText("readme.md", "# Users\n\n```ts\nconst User = type(\"string[]\")\n```\n")
		assertEquals(listOf("string:type.builtin", "[]:operator"), recolored())
	}

	fun `test the closest problem is shown inline`() {
		myFixture.configureByText("broken.ts", "const a = 1\nconst b = ;\n<caret>const c = 2\n")
		myFixture.doHighlighting()
		project.service<InlineErrors>().update(myFixture.editor)
		val inlays = myFixture.editor.inlayModel.getAfterLineEndElementsInRange(0, myFixture.editor.document.textLength)
		val messages = inlays.map { (it.renderer as InlineErrorRenderer).message }
		assertEquals(1, messages.size)
		assertEquals(1, messages.single().line)
		assertEquals(myFixture.doHighlighting().first { it.severity == HighlightSeverity.ERROR }.description, messages.single().text)
	}

	fun `test completion pops up in definition strings only`() {
		myFixture.configureByText(
			"completion.ts",
			"type({ a: [\"string\"] })\nscope({ b: \"number\" }).type(\"b\")\nx.or(\"string\")\nfactor(\"string\")\nconst s = \"string\"\n"
		)
		val inDefinition = PsiTreeUtil.findChildrenOfType(myFixture.file, JSLiteralExpression::class.java)
			.filter { it.isQuotedLiteral }
			.map { it.text to ArkTypeCompletionConfidence.isInDefinition(it) }
		assertEquals(
			listOf("\"string\"" to true, "\"number\"" to true, "\"b\"" to true, "\"string\"" to true, "\"string\"" to false, "\"string\"" to false),
			inDefinition
		)
	}
}
