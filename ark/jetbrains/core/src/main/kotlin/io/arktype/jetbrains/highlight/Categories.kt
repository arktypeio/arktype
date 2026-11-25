package io.arktype.jetbrains.highlight

import com.google.gson.JsonParser

/** A `categories.json` rule: a scope equal to [prefix] or starting with `[prefix].` has [category]. */
data class CategoryRule(val prefix: String, val category: String)

/**
 * Maps TextMate scope stacks to highlight categories exactly as the editor
 * conformance oracle does (`ark/editor-conformance/highlighting/categories.ts`),
 * from the same `categories.json`.
 */
class Categories(val rules: List<CategoryRule>) {
	/** The category of a scope stack (root first); `none` is the default foreground. */
	fun categorize(scopes: List<String>): String {
		for (i in scopes.indices.reversed()) {
			for (rule in rules) if (matches(scopes[i], rule.prefix)) return rule.category
		}
		return NONE
	}

	companion object {
		const val NONE = "none"

		val conformance: Categories by lazy {
			val json = Categories::class.java.getResourceAsStream("/io/arktype/jetbrains/categories.json")
				?.reader()?.use { it.readText() }
				?: error("categories.json is missing from the plugin's resources")
			fromJson(json)
		}

		fun fromJson(json: String): Categories =
			Categories(JsonParser.parseString(json).asJsonObject.getAsJsonArray("rules").map {
				val rule = it.asJsonObject
				CategoryRule(rule["prefix"].asString, rule["category"].asString)
			})

		fun matches(scope: String, prefix: String): Boolean =
			scope == prefix || (scope.length > prefix.length && scope.startsWith(prefix) && scope[prefix.length] == '.')

		private fun isStringOrComment(scope: String): Boolean =
			matches(scope, "string") || matches(scope, "comment") ||
				matches(scope, "punctuation.definition.string") || matches(scope, "punctuation.definition.comment")

		private fun isCode(scope: String): Boolean =
			scope.startsWith("source.") || matches(scope, "meta.template.expression") || matches(scope, "meta.embedded")

		/**
		 * Whether the host grammar alone puts a character in a string or
		 * comment: the innermost string, comment or embedded-code scope
		 * decides, so code in a template substitution or an embedded block is
		 * not string text.
		 */
		fun isStringOrCommentText(scopes: List<String>): Boolean {
			for (i in scopes.indices.reversed()) {
				if (isStringOrComment(scopes[i])) return true
				if (isCode(scopes[i])) return false
			}
			return false
		}
	}
}
