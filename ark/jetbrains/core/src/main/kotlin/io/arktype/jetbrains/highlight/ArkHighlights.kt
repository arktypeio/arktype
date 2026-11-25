package io.arktype.jetbrains.highlight

import com.google.gson.JsonParser
import io.arktype.jetbrains.textmate.ScopedToken
import java.util.regex.Pattern

/** Tokenizes [source] as a file with extension [ext], with or without the ArkType injection. */
fun interface Tokenizer {
	fun tokenize(source: String, ext: String, ark: Boolean): List<List<ScopedToken>>
}

/** Where a character is: in a host string or comment, or elsewhere. */
enum class Region(val id: String) {
	TEXT("text"),
	CODE("code")
}

/**
 * A run of non-whitespace characters on one line sharing a category, in the
 * editor conformance schema (`ark/editor-conformance/highlighting/spans.ts`):
 * 0-based [line], 0-based UTF-16 [column].
 */
data class Span(
	val line: Int,
	val column: Int,
	val length: Int,
	val text: String,
	val category: String,
	val region: Region,
	/** in the code region, the category without ArkType */
	val baseCategory: String? = null
)

/** What ArkType changes in a file: the conformance [spans] and the [recolored] ranges an editor paints. */
data class FileHighlights(
	/** every character the oracle compares, as the oracle would emit it */
	val spans: List<Span>,
	/** the runs of host string text ArkType gives a category other than the host's own */
	val recolored: List<Span>
)

/**
 * Computes ArkType's highlighting for a file the way the editor conformance
 * oracle (`ark/editor-conformance/highlighting/oracle.ts`) does: tokenize it
 * with and without the extension's injection grammar, then categorize each
 * character's scopes.
 */
class ArkHighlights(
	private val tokenizer: Tokenizer,
	private val categories: Categories = Categories.conformance,
	private val triggers: List<Pattern> = injectionTriggers()
) {
	/**
	 * Whether the injection grammar can match anywhere in [source]. Each of
	 * its rules starts with a `begin` that must match, so a file none of them
	 * match is highlighted exactly as its host grammar alone would.
	 */
	fun mayContainArkType(source: String): Boolean = triggers.any { it.matcher(source).find() }

	fun compute(source: String, ext: String): FileHighlights {
		val lines = source.split("\n")
		if (!mayContainArkType(source)) return FileHighlights(spans = hostOnlySpans(source, ext, lines), recolored = emptyList())
		val base = scopesByChar(tokenizer.tokenize(source, ext, ark = false), lines)
		val ark = scopesByChar(tokenizer.tokenize(source, ext, ark = true), lines)
		val spans = ArrayList<Span>()
		val recolored = ArrayList<Span>()
		lines.forEachIndexed { line, text ->
			val oracle = arrayOfNulls<CharCategory>(text.length)
			val changed = arrayOfNulls<CharCategory>(text.length)
			for (column in text.indices) {
				val withArk = ark[line][column]
				val withoutArk = base[line][column]
				val category = categories.categorize(withArk)
				val baseCategory = categories.categorize(withoutArk)
				if (Categories.isStringOrCommentText(withoutArk)) {
					oracle[column] = CharCategory(category, Region.TEXT, baseCategory, withArk)
					if (category != baseCategory) changed[column] = CharCategory(category, Region.TEXT, scopes = withArk)
					continue
				}
				if (baseCategory != category) oracle[column] = CharCategory(category, Region.CODE, baseCategory, withArk)
			}
			toSpans(line, text, oracle, spans)
			toSpans(line, text, changed, recolored)
		}
		return FileHighlights(spans, recolored)
	}

	private fun hostOnlySpans(source: String, ext: String, lines: List<String>): List<Span> {
		val base = scopesByChar(tokenizer.tokenize(source, ext, ark = false), lines)
		val spans = ArrayList<Span>()
		lines.forEachIndexed { line, text ->
			val chars = Array(text.length) { column ->
				val scopes = base[line][column]
				if (!Categories.isStringOrCommentText(scopes)) null
				else categories.categorize(scopes).let { CharCategory(it, Region.TEXT, it, scopes) }
			}
			toSpans(line, text, chars, spans)
		}
		return spans
	}

	/**
	 * A character's category. Its [scopes] are part of its identity, so runs
	 * split where the TextMate scopes change, as the oracle's spans do.
	 */
	private data class CharCategory(
		val category: String,
		val region: Region,
		val baseCategory: String? = null,
		val scopes: List<String> = emptyList()
	)

	private companion object {
		val NO_SCOPES: List<String> = emptyList()

		fun scopesByChar(tokens: List<List<ScopedToken>>, lines: List<String>): List<Array<List<String>>> =
			lines.mapIndexed { line, text ->
				val chars = Array(text.length) { NO_SCOPES }
				for (token in tokens[line]) for (c in token.start until minOf(token.end, text.length)) chars[c] = token.scopes
				chars
			}

		/** maximal runs of non-whitespace characters sharing a category, as `toSpans` in spans.ts */
		fun toSpans(line: Int, text: String, chars: Array<CharCategory?>, into: MutableList<Span>) {
			var start = -1
			var open: CharCategory? = null
			for (column in 0..text.length) {
				val c = if (column < text.length && !isJsWhitespace(text[column])) chars[column] else null
				if (open != null && c == open) continue
				if (open != null) into += Span(line, start, column - start, text.substring(start, column), open.category, open.region, open.baseCategory)
				open = c
				start = column
			}
		}

		/** JavaScript's `/\s/` */
		fun isJsWhitespace(c: Char): Boolean =
			c == '\t' || c == '\n' || c == '\u000B' || c == '\u000C' || c == '\r' || c == ' ' || c == ' ' ||
				c == ' ' || c in ' '..' ' || c == ' ' || c == ' ' || c == ' ' ||
				c == ' ' || c == '　' || c == '﻿'

		/**
		 * The `begin` of each rule the injection grammar's top-level patterns
		 * include, without `\b`: Java's word boundary isn't Oniguruma's, and
		 * dropping an assertion can only widen what matches, so this never
		 * rules out a file Oniguruma would match.
		 */
		fun injectionTriggers(): List<Pattern> {
			val json = ArkHighlights::class.java.getResourceAsStream("/io/arktype/jetbrains/grammars/source.arktype.injection.ts.json")
				?.reader()?.use { it.readText() }
				?: error("the ArkType injection grammar is missing from the plugin's resources")
			val grammar = JsonParser.parseString(json).asJsonObject
			val repository = grammar.getAsJsonObject("repository")
			return grammar.getAsJsonArray("patterns").map {
				val name = it.asJsonObject["include"].asString.removePrefix("#")
				Pattern.compile(repository.getAsJsonObject(name)["begin"].asString.replace("\\b", ""))
			}
		}
	}
}
