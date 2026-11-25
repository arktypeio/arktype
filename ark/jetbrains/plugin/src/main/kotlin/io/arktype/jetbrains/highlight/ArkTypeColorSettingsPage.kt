package io.arktype.jetbrains.highlight

import com.intellij.openapi.fileTypes.PlainSyntaxHighlighter
import com.intellij.openapi.fileTypes.SyntaxHighlighter
import com.intellij.openapi.options.colors.AttributesDescriptor
import com.intellij.openapi.options.colors.ColorDescriptor
import com.intellij.openapi.options.colors.ColorSettingsPage
import com.intellij.openapi.editor.colors.TextAttributesKey
import javax.swing.Icon

/** Editor | Color Scheme | ArkType */
class ArkTypeColorSettingsPage : ColorSettingsPage {
	override fun getDisplayName(): String = "ArkType"

	override fun getIcon(): Icon? = null

	override fun getHighlighter(): SyntaxHighlighter = PlainSyntaxHighlighter()

	override fun getAttributeDescriptors(): Array<AttributesDescriptor> =
		ArkTypeColors.keys.map { (category, key) -> AttributesDescriptor(ArkTypeColors.displayName(category), key) }.toTypedArray()

	override fun getColorDescriptors(): Array<ColorDescriptor> = ColorDescriptor.EMPTY_ARRAY

	// the demo is drawn from the same tokenizer as the editor, so it can't
	// drift from what a definition actually looks like
	override fun getDemoText(): String = demo.text

	override fun getAdditionalHighlightingTagToDescriptorMap(): Map<String, TextAttributesKey> = demo.tags

	private val demo by lazy { DemoText.render(DEMO_SOURCE) }

	private companion object {
		val DEMO_SOURCE = """
			const User = type({
				name: "string > 0",
				email: "string.email",
				age: "0 <= number.integer < 150",
				tags: "(string | 'admin')[]",
				id: "/^[a-z]{3}\d+$/"
			}).or({ guest: "true" })
		""".trimIndent()
	}
}
