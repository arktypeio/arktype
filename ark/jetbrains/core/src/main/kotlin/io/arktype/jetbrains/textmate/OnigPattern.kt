package io.arktype.jetbrains.textmate

import org.jcodings.specific.UTF8Encoding
import org.joni.Matcher
import org.joni.Option
import org.joni.Regex
import org.joni.Syntax
import org.joni.WarnCallback
import org.joni.exception.JOniException
import java.util.concurrent.ConcurrentHashMap

/**
 * A TextMate pattern compiled for joni so it matches as Oniguruma 6.9.8
 * (vscode-oniguruma's) does.
 *
 * Most patterns compile as they are. joni, a port of an older Oniguruma,
 * rejects look-behinds that 6.9 accepts; [translate] rewrites those into
 * equivalents (see [LookbehindRewriter]) and maps the rewritten pattern's
 * groups back to the original's.
 */
internal class OnigPattern private constructor(
	val source: String,
	private val regex: Regex,
	/** for each group of [regex] (from 1), the original group it stands for */
	private val groupMap: IntArray?,
	private val originalGroups: Int,
	/** an unbounded look-behind leading the pattern, checked after each match */
	private val prefixLookbehind: PrefixLookbehind?
) {
	/**
	 * Whether joni's analysis, like Oniguruma's, anchors this pattern on a
	 * leading greedy `.*` (`ANCR_ANYCHAR_INF`). Oniguruma's RegSet search
	 * then only tries it where a line starts, even when what precedes the
	 * `.*` (a look-behind, a word boundary) could fail there and succeed
	 * later; see [OnigScanner].
	 */
	val anycharStar: Boolean = (anchorField?.getInt(regex) ?: 0) and ANYCHAR_STAR != 0

	/** vscode-oniguruma's `hasGAnchor`: any `\G`, escaped or not, so its matches depend on the search start */
	val hasGAnchor: Boolean = (0 until source.length - 1).any { source[it] == '\\' && source[it + 1] == 'G' }

	fun matcher(bytes: ByteArray, end: Int): Matcher = regex.matcher(bytes, 0, end)

	private val literals = requiredLiterals(source)

	/**
	 * Searches from [start] (UTF-8 offsets) with [matcher], from [matcher]
	 * over [bytes], `\G` matching at [gpos]. Returns begin/end pairs per group.
	 */
	fun search(matcher: Matcher, bytes: ByteArray, end: Int, gpos: Int, start: Int): IntArray? {
		if (literals != null && !containsAny(bytes, start, end, literals)) return null
		var from = start
		while (true) {
			val begin = matcher.search(gpos, from, end, Option.NONE)
			if (begin < 0) return null
			val region = region(matcher)
			if (prefixLookbehind == null) return region
			if (prefixLookbehind.check(bytes, begin, region)) return region
			if (begin >= end) return null
			from = begin + UTF8Encoding.INSTANCE.length(bytes, begin, end)
		}
	}

	/** Matches at exactly [at], `\G` matching there too. */
	fun matchAt(bytes: ByteArray, end: Int, at: Int): IntArray? {
		val matcher = regex.matcher(bytes, 0, end)
		if (matcher.match(at, end, Option.NONE) < 0) return null
		val region = region(matcher)
		if (prefixLookbehind != null && !prefixLookbehind.check(bytes, at, region)) return null
		return region
	}

	private fun region(matcher: Matcher): IntArray {
		val region = matcher.eagerRegion
		val map = groupMap
		if (map == null) {
			return IntArray(region.numRegs * 2) { if (it % 2 == 0) region.getBeg(it / 2) else region.getEnd(it / 2) }
		}
		val result = IntArray((originalGroups + 1) * 2) { -1 }
		result[0] = region.getBeg(0)
		result[1] = region.getEnd(0)
		for (group in 1 until region.numRegs) {
			val original = map[group]
			// of the copies of a group, the one that matched
			if (original > 0 && result[original * 2] < 0 && region.getBeg(group) >= 0) {
				result[original * 2] = region.getBeg(group)
				result[original * 2 + 1] = region.getEnd(group)
			}
		}
		return result
	}

	/**
	 * A look-behind joni can't compile (an unbounded one, like `(?<=x.*?)`)
	 * leading the pattern: the pattern's remainder matches first, then the
	 * look-behind is checked where the match begins. Its groups, which come
	 * first, are filled from the check: Oniguruma steps back from the
	 * position one character at a time, so the nearest start wins.
	 */
	private class PrefixLookbehind(
		private val body: Regex,
		private val negative: Boolean,
		private val groups: IntRange
	) {
		fun check(bytes: ByteArray, at: Int, region: IntArray): Boolean {
			val matcher = body.matcher(bytes, 0, at)
			var q = at
			while (true) {
				if (matcher.match(q, at, Option.NONE) >= 0) {
					if (negative) return false
					val found = matcher.eagerRegion
					for (group in groups) {
						val local = group - groups.first + 1
						region[group * 2] = found.getBeg(local)
						region[group * 2 + 1] = found.getEnd(local)
					}
					return true
				}
				if (q == 0) break
				q = UTF8Encoding.INSTANCE.prevCharHead(bytes, 0, q, at)
			}
			for (group in groups) {
				region[group * 2] = -1
				region[group * 2 + 1] = -1
			}
			return negative
		}
	}

	companion object {
		private const val ANYCHAR_STAR = 0x4000

		/** joni's `Regex.anchor`, the optimizer's anchors, package-private */
		private val anchorField =
			try {
				Regex::class.java.getDeclaredField("anchor").apply { isAccessible = true }
			} catch (_: Exception) {
				null
			}

		private val cache = ConcurrentHashMap<String, OnigPattern>()

		/**
		 * End patterns with back-references compile once per text they
		 * captured, so a long session could fill the cache: past this size it
		 * starts over (scanners keep the patterns they hold).
		 */
		private const val MAX_CACHED = 16_384

		fun get(source: String): OnigPattern =
			cache[source]
				?: run {
					if (cache.size >= MAX_CACHED) cache.clear()
					cache.getOrPut(source) { translate(source) }
				}

		/**
		 * Oniguruma 6.9's default syntax (`ONIG_SYNTAX_ONIGURUMA`) as near as
		 * joni comes: its Ruby syntax plus `\uHHHH`, without Ruby's
		 * `ASCII_RANGE` (which makes `\w`, `\d`, `\s` and `\b` ASCII-only).
		 */
		private val syntax =
			Syntax(
				"ONIGURUMA",
				Syntax.RUBY.op or Syntax.OP_ESC_O_BRACE_OCTAL,
				Syntax.RUBY.op2 or Syntax.OP2_ESC_U_HEX4,
				Syntax.RUBY.op3,
				Syntax.RUBY.behavior,
				Option.NONE,
				Syntax.RUBY.metaCharTable
			)

		/**
		 * Compiles like vscode-oniguruma's `createOnigRegExp`:
		 * `ONIG_OPTION_CAPTURE_GROUP` (plain groups capture beside named ones),
		 * UTF-8 and the default syntax.
		 */
		fun compile(source: String): Regex {
			val bytes = OnigString(superDots(source)).utf8
			return Regex(bytes, 0, bytes.size, Option.CAPTURE_GROUP, UTF8Encoding.INSTANCE, syntax, WarnCallback.NONE)
		}

		/**
		 * Oniguruma's `\\N` (any character but a newline) and `\\O` (any
		 * character), which joni lacks, as the groups they stand for.
		 */
		private fun superDots(source: String): String {
			if (!source.contains("\\N") && !source.contains("\\O")) return source
			val result = StringBuilder(source.length + 8)
			var classDepth = 0
			var i = 0
			while (i < source.length) {
				val c = source[i]
				if (c == '\\' && i + 1 < source.length) {
					val next = source[i + 1]
					when {
						classDepth == 0 && next == 'N' -> result.append("(?-m:.)")
						classDepth == 0 && next == 'O' -> result.append("(?m:.)")
						else -> result.append(c).append(next)
					}
					i += 2
					continue
				}
				if (c == '[') classDepth++
				else if (c == ']' && classDepth > 0) classDepth--
				result.append(c)
				i++
			}
			return result.toString()
		}

		private fun translate(source: String): OnigPattern {
			val error =
				try {
					return OnigPattern(source, compile(source), null, 0, null)
				} catch (e: JOniException) {
					e
				}
			val rewritten =
				try {
					LookbehindRewriter.rewrite(source)
				} catch (e: Exception) {
					null
				} ?: throw TextMateRegexException(source, error)
			try {
				val prefix =
					rewritten.prefix?.let {
						PrefixLookbehind(compile("${it.options}(?:${it.body})\\z"), it.negative, it.groups)
					}
				return OnigPattern(source, compile(rewritten.pattern), rewritten.groupMap, rewritten.originalGroups, prefix)
			} catch (e: JOniException) {
				throw TextMateRegexException(source, e)
			}
		}
	}
}
