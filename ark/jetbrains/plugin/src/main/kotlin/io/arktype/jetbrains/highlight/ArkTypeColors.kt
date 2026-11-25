package io.arktype.jetbrains.highlight

import com.intellij.openapi.editor.DefaultLanguageHighlighterColors as Default
import com.intellij.openapi.editor.HighlighterColors
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.editor.colors.TextAttributesKey.createTextAttributesKey

/**
 * A color for each category the editor conformance suite gives a character
 * (its `categories.json`). Each falls back to the IDE's color for the same
 * kind of TypeScript token, so a definition's strings read like the types
 * they describe in any color scheme; Editor | Color Scheme | ArkType
 * overrides them.
 */
object ArkTypeColors {
	private val fallbacks: Map<String, TextAttributesKey> = linkedMapOf(
		"type.builtin" to Default.KEYWORD,
		"type" to Default.CLASS_REFERENCE,
		"module" to Default.CLASS_REFERENCE,
		"number" to Default.NUMBER,
		"operator" to Default.OPERATION_SIGN,
		"keyword" to Default.KEYWORD,
		"boolean" to Default.KEYWORD,
		"constant.builtin" to Default.KEYWORD,
		"string" to Default.STRING,
		"string.escape" to Default.VALID_STRING_ESCAPE,
		"string.regexp" to Default.STRING,
		"punctuation.bracket" to Default.BRACKETS,
		"punctuation.delimiter" to Default.COMMA,
		"punctuation" to Default.OPERATION_SIGN,
		"property" to Default.INSTANCE_FIELD,
		"function" to Default.FUNCTION_CALL,
		"variable" to Default.LOCAL_VARIABLE,
		"variable.parameter" to Default.PARAMETER,
		"variable.builtin" to Default.KEYWORD,
		"label" to Default.LABEL,
		"comment" to Default.LINE_COMMENT,
		"none" to HighlighterColors.TEXT
	)

	val keys: Map<String, TextAttributesKey> = fallbacks.mapValues { (category, fallback) ->
		createTextAttributesKey("ARKTYPE_" + category.uppercase().replace('.', '_'), fallback)
	}

	/** The key for [category], or for the nearest broader category (`string.special` → `string`). */
	fun forCategory(category: String): TextAttributesKey {
		var c = category
		while (true) {
			keys[c]?.let { return it }
			val dot = c.lastIndexOf('.')
			if (dot == -1) return keys.getValue("none")
			c = c.substring(0, dot)
		}
	}

	fun displayName(category: String): String = when (category) {
		"type.builtin" -> "Built-in type (string, number...)"
		"type" -> "Type or keyword (Date, string.email...)"
		"module" -> "Keyword module"
		"number" -> "Number"
		"operator" -> "Operator (|, &, <, %...)"
		"keyword" -> "Keyword"
		"boolean" -> "Boolean"
		"constant.builtin" -> "Built-in constant"
		"string" -> "String delimiter"
		"string.escape" -> "Escape"
		"string.regexp" -> "Regex"
		"punctuation.bracket" -> "Brackets"
		"punctuation.delimiter" -> "Delimiter"
		"punctuation" -> "Punctuation"
		"property" -> "Property"
		"function" -> "Function"
		"variable" -> "Variable"
		"variable.parameter" -> "Parameter"
		"variable.builtin" -> "Built-in variable"
		"label" -> "Label"
		"comment" -> "Comment"
		"none" -> "Other text"
		else -> category
	}
}
