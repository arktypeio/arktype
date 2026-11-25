package io.arktype.jetbrains.errors

import java.util.regex.Pattern

/**
 * Compiles a JavaScript regex source to a [Pattern] that matches the same
 * strings, so rules written for VS Code (ErrorLens's `errorLens.replace`)
 * behave identically here.
 *
 * Only the differences that change what a pattern matches are translated:
 * - `.` excludes exactly JavaScript's line terminators (`\n`, `\r`, U+2028,
 *   U+2029); Java's `.` also excludes U+0085
 * - `$` without the `m` flag is the end of input only; Java's also matches
 *   before a final line terminator
 * - `[^]` matches any character and `[]` none; Java reads both as the start
 *   of a class containing `]`
 * - inside a class, `[` and `&&` are literals; Java reads them as a nested
 *   class and an intersection
 * - `\s` is Unicode whitespace; Java's is ASCII
 * - `\v` is U+000B (Java: any vertical whitespace), `\0` is NUL (Java: an
 *   octal escape) and `\b` in a class is a backspace
 * - `\u{...}` (with the `u` flag) is a code point escape
 */
object JsRegex {
	/** JavaScript's `\s`: WhiteSpace and LineTerminator from the spec */
	private const val SPACE_CLASS_BODY =
		"\\t\\n\\x0B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF"

	private const val DOT = "[^\\n\\r\\u2028\\u2029]"

	fun compile(source: String, flags: String = ""): Pattern {
		var javaFlags = 0
		if ('i' in flags) {
			javaFlags = javaFlags or Pattern.CASE_INSENSITIVE
			if ('u' in flags) javaFlags = javaFlags or Pattern.UNICODE_CASE
		}
		// `s` and `m` are translated into the pattern itself
		return Pattern.compile(translate(source, dotAll = 's' in flags, multiline = 'm' in flags), javaFlags)
	}

	fun translate(source: String, dotAll: Boolean = false, multiline: Boolean = false): String {
		val out = StringBuilder()
		var i = 0
		var inClass = false
		while (i < source.length) {
			val c = source[i]
			when {
				c == '\\' && i + 1 < source.length -> {
					i = translateEscape(source, i + 1, inClass, out)
					continue
				}
				inClass -> when (c) {
					']' -> {
						inClass = false
						out.append(']')
					}
					'[' -> out.append("\\[")
					'&' -> out.append("\\&")
					else -> out.append(c)
				}
				c == '[' -> {
					val negated = source.startsWith("^", i + 1)
					val bodyStart = if (negated) i + 2 else i + 1
					if (source.startsWith("]", bodyStart)) {
						// JavaScript's empty classes: [] never matches, [^] always does
						out.append(if (negated) "[\\s\\S]" else "(?!)")
						i = bodyStart + 1
						continue
					}
					inClass = true
					out.append(if (negated) "[^" else "[")
					i = bodyStart
					continue
				}
				c == '.' -> out.append(if (dotAll) "[\\s\\S]" else DOT)
				c == '$' -> out.append(if (multiline) "(?=[\\n\\r\\u2028\\u2029]|\\z)" else "\\z")
				c == '^' && multiline -> out.append("(?<=[\\n\\r\\u2028\\u2029]|\\A)")
				else -> out.append(c)
			}
			i++
		}
		return out.toString()
	}

	/** Appends the translation of the escape whose letter is at [at], returning the index after it. */
	private fun translateEscape(source: String, at: Int, inClass: Boolean, out: StringBuilder): Int {
		val c = source[at]
		when (c) {
			's' -> out.append(if (inClass) SPACE_CLASS_BODY else "[$SPACE_CLASS_BODY]")
			// Java unions a nested class into the enclosing one
			'S' -> out.append("[^$SPACE_CLASS_BODY]")
			'v' -> out.append("\\x0B")
			'0' -> if (at + 1 < source.length && source[at + 1].isDigit()) out.append("\\0") else out.append("\\x00")
			'b' -> out.append(if (inClass) "\\x08" else "\\b")
			'u' -> if (source.startsWith("{", at + 1)) {
				val close = source.indexOf('}', at + 2)
				out.append("\\x{").append(source, at + 2, close).append('}')
				return close + 1
			} else out.append("\\u")
			else -> out.append('\\').append(c)
		}
		return at + 1
	}
}
