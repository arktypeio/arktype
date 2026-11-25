package io.arktype.jetbrains.errors

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.util.regex.Pattern

/** One `errorLens.replace` entry: a message matching [matcher] is shown as [message]. */
data class ReplaceRule(val matcher: String, val message: String) {
	/** ErrorLens compiles every matcher with `new RegExp(matcher, "iu")` */
	val pattern: Pattern = JsRegex.compile(matcher, "iu")
}

/** How ErrorLens picks which problems to show inline (`errorLens.followCursor`). */
enum class FollowCursor(val setting: String) {
	/** every line with a problem */
	ALL_LINES("allLines"),

	/** only the line(s) with a problem closest to the cursor */
	CLOSEST_PROBLEM("closestProblem"),

	/** only the cursor's line */
	ACTIVE_LINE("activeLine");

	companion object {
		fun of(setting: String): FollowCursor = entries.first { it.setting == setting }
	}
}

/**
 * The ErrorLens settings the VS Code extension sets (its package.json
 * `contributes.configurationDefaults`) and the ErrorLens defaults it leaves,
 * as of usernamehw/vscode-error-lens 43632f75 (v3.30.0).
 */
data class ErrorLensConfig(
	val replace: List<ReplaceRule>,
	val followCursor: FollowCursor = FollowCursor.ALL_LINES,
	val followCursorMore: Int = 0,
	val removeLinebreaks: Boolean = true,
	val replaceLinebreaksSymbol: String = "⏎",
	val messageMaxChars: Int = 500
) {
	companion object {
		/** what the ArkType VS Code extension configures, read from its manifest */
		val extension: ErrorLensConfig by lazy {
			val manifest = ErrorLensConfig::class.java.getResourceAsStream("/io/arktype/jetbrains/extension.package.json")
				?: error("extension.package.json is missing from the plugin's resources")
			fromManifest(manifest.reader().use { it.readText() })
		}

		fun fromManifest(json: String): ErrorLensConfig {
			val defaults = JsonParser.parseString(json).asJsonObject
				.getAsJsonObject("contributes")
				.getAsJsonObject("configurationDefaults")
			return ErrorLensConfig(
				replace = defaults.getAsJsonArray("errorLens.replace").map {
					val rule = it.asJsonObject
					ReplaceRule(rule["matcher"].asString, rule["message"].asString)
				},
				followCursor = defaults.stringOrNull("errorLens.followCursor")?.let(FollowCursor::of) ?: FollowCursor.ALL_LINES
			)
		}

		private fun JsonObject.stringOrNull(key: String): String? = get(key)?.takeIf { it.isJsonPrimitive }?.asString
	}
}

/**
 * ErrorLens's message pipeline for an inline (end of line) message, ported
 * from `prepareMessage` and `diagnosticToInlineMessage` in
 * usernamehw/vscode-error-lens `src/utils/extUtils.ts`.
 */
class ErrorLens(val config: ErrorLensConfig = ErrorLensConfig.extension) {
	/** The message shown at the end of the line for a diagnostic with [message]. */
	fun inlineMessage(message: String): String {
		val replaced = replace(message)
		// messageTemplate is "$message", which leaves the message as is
		val singleLine = if (config.removeLinebreaks) replaced.replace(LINEBREAKS, config.replaceLinebreaksSymbol) else replaced
		return truncate(singleLine, config.messageMaxChars)
	}

	/**
	 * `errorLens.replace`: the first rule whose matcher matches anywhere in
	 * [message] replaces the WHOLE message with its `message`, after
	 * substituting `$0`, `$1`... with the match's groups. No rule matching
	 * leaves the message as is.
	 */
	fun replace(message: String): String {
		if (message.isEmpty()) return ""
		val index = matchingRule(message) ?: return message
		val match = config.replace[index].pattern.matcher(message).also { it.find() }
		var result = config.replace[index].message
		for (group in 0..match.groupCount()) {
			// JavaScript stringifies a group that didn't participate as "undefined"
			result = replaceAllAsJs(result, "\$$group", match.group(group) ?: "undefined")
		}
		return result
	}

	/** The index of the `errorLens.replace` rule that rewrites [message], or null if none does. */
	fun matchingRule(message: String): Int? =
		if (message.isEmpty()) null else config.replace.indexOfFirst { it.pattern.matcher(message).find() }.takeIf { it != -1 }

	private companion object {
		val LINEBREAKS: Regex = Regex("[\\n\\r\\t]+")

		/**
		 * `str.replace(new RegExp("\\$" + n, "gu"), replacement)`: every
		 * occurrence of [literal], with [replacement] read as a JavaScript
		 * replacement template for a pattern without capture groups, so
		 * `$$`, `$&`, `` $` `` and `$'` in captured text are expanded.
		 */
		fun replaceAllAsJs(str: String, literal: String, replacement: String): String {
			val out = StringBuilder()
			var from = 0
			while (true) {
				val at = str.indexOf(literal, from)
				if (at == -1) break
				out.append(str, from, at)
				expandReplacement(replacement, str, at, literal, out)
				from = at + literal.length
			}
			return out.append(str, from, str.length).toString()
		}

		/** GetSubstitution from the ECMAScript spec, for a match without captures. */
		fun expandReplacement(replacement: String, str: String, position: Int, matched: String, out: StringBuilder) {
			var i = 0
			while (i < replacement.length) {
				val c = replacement[i]
				val next = replacement.getOrNull(i + 1)
				if (c != '$' || next == null) {
					out.append(c)
					i++
					continue
				}
				when (next) {
					'$' -> out.append('$')
					'&' -> out.append(matched)
					'`' -> out.append(str, 0, position)
					'\'' -> out.append(str, position + matched.length, str.length)
					else -> {
						// `$n` and `$<name>` refer to captures this pattern doesn't have
						out.append('$')
						i++
						continue
					}
				}
				i += 2
			}
		}

		/** at most [max] code points, with "…" appended when cut */
		fun truncate(str: String, max: Int): String {
			val codePoints = str.codePointCount(0, str.length)
			if (codePoints <= max) return str
			return str.substring(0, str.offsetByCodePoints(0, max)) + "…"
		}
	}
}
