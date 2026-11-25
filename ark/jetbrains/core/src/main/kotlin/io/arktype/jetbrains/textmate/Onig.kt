package io.arktype.jetbrains.textmate

import java.util.concurrent.atomic.AtomicInteger

/**
 * One capture group of a match, in UTF-16 offsets of the searched string.
 * A group that didn't participate has `start == end`, so it reads as empty,
 * as vscode-oniguruma's unmatched groups do once vscode-textmate slices them.
 */
internal class CaptureIndex(@JvmField val start: Int, @JvmField val end: Int) {
	@JvmField val length = end - start
}

internal class OnigMatch(@JvmField val index: Int, @JvmField val captureIndices: Array<CaptureIndex>)

/**
 * A string prepared for searching: its UTF-8 bytes and the maps between
 * UTF-8 and UTF-16 offsets, ported from `UtfString`/`OnigString` in
 * `@shikijs/engine-oniguruma` (itself vscode-oniguruma's). Lone surrogates
 * encode as three bytes, as they do there.
 */
internal class OnigString(@JvmField val content: String) {
	@JvmField val id = lastId.incrementAndGet()
	@JvmField val utf16Length = content.length
	@JvmField val utf8: ByteArray
	@JvmField val utf8Length: Int
	private val utf16ToUtf8: IntArray?
	private val utf8ToUtf16: IntArray?

	init {
		val str = content
		val len16 = str.length
		val len8 = utf8ByteLength(str)
		val mapped = len8 != len16
		val to8 = if (mapped) IntArray(len16 + 1).also { it[len16] = len8 } else null
		val to16 = if (mapped) IntArray(len8 + 1).also { it[len8] = len16 } else null
		val bytes = ByteArray(len8)
		var i8 = 0
		var i16 = 0
		while (i16 < len16) {
			val charCode = str[i16].code
			var codePoint = charCode
			var wasSurrogatePair = false
			if (charCode in 0xD800..0xDBFF && i16 + 1 < len16) {
				val next = str[i16 + 1].code
				if (next in 0xDC00..0xDFFF) {
					codePoint = ((charCode - 0xD800) shl 10) + 0x10000 or (next - 0xDC00)
					wasSurrogatePair = true
				}
			}
			if (to8 != null && to16 != null) {
				to8[i16] = i8
				if (wasSurrogatePair) to8[i16 + 1] = i8
				val n =
					when {
						codePoint <= 0x7F -> 1
						codePoint <= 0x7FF -> 2
						codePoint <= 0xFFFF -> 3
						else -> 4
					}
				for (k in 0 until n) to16[i8 + k] = i16
			}
			when {
				codePoint <= 0x7F -> bytes[i8++] = codePoint.toByte()
				codePoint <= 0x7FF -> {
					bytes[i8++] = (0xC0 or (codePoint and 0x7C0 ushr 6)).toByte()
					bytes[i8++] = (0x80 or (codePoint and 0x3F)).toByte()
				}
				codePoint <= 0xFFFF -> {
					bytes[i8++] = (0xE0 or (codePoint and 0xF000 ushr 12)).toByte()
					bytes[i8++] = (0x80 or (codePoint and 0xFC0 ushr 6)).toByte()
					bytes[i8++] = (0x80 or (codePoint and 0x3F)).toByte()
				}
				else -> {
					bytes[i8++] = (0xF0 or (codePoint and 0x1C0000 ushr 18)).toByte()
					bytes[i8++] = (0x80 or (codePoint and 0x3F000 ushr 12)).toByte()
					bytes[i8++] = (0x80 or (codePoint and 0xFC0 ushr 6)).toByte()
					bytes[i8++] = (0x80 or (codePoint and 0x3F)).toByte()
				}
			}
			if (wasSurrogatePair) i16++
			i16++
		}
		utf8 = bytes
		utf8Length = len8
		utf16ToUtf8 = to8
		utf8ToUtf16 = to16
	}

	private val searches = HashMap<OnigPattern, CachedSearch>()

	/** [pattern]'s search state for this string, shared by every scanner with the pattern. */
	fun cachedSearch(pattern: OnigPattern): CachedSearch =
		searches.getOrPut(pattern) { CachedSearch(pattern, pattern.matcher(utf8, utf8Length)) }

	fun utf8ToUtf16(offset: Int): Int {
		val map = utf8ToUtf16 ?: return offset
		if (offset < 0) return 0
		if (offset > utf8Length) return utf16Length
		return map[offset]
	}

	fun utf16ToUtf8(offset: Int): Int {
		val map = utf16ToUtf8 ?: return offset
		if (offset < 0) return 0
		if (offset > utf16Length) return utf8Length
		return map[offset]
	}

	companion object {
		private val lastId = AtomicInteger()

		fun utf8ByteLength(str: String): Int {
			var result = 0
			var i = 0
			val len = str.length
			while (i < len) {
				val charCode = str[i].code
				var codePoint = charCode
				var wasSurrogatePair = false
				if (charCode in 0xD800..0xDBFF && i + 1 < len) {
					val next = str[i + 1].code
					if (next in 0xDC00..0xDFFF) {
						codePoint = ((charCode - 0xD800) shl 10) + 0x10000 or (next - 0xDC00)
						wasSurrogatePair = true
					}
				}
				result +=
					when {
						codePoint <= 0x7F -> 1
						codePoint <= 0x7FF -> 2
						codePoint <= 0xFFFF -> 3
						else -> 4
					}
				if (wasSurrogatePair) i++
				i++
			}
			return result
		}
	}
}

/**
 * A pattern's last search of a string, as vscode-oniguruma's `OnigRegExp`
 * keeps it, and the matcher it searches the string with.
 */
internal class CachedSearch(private val pattern: OnigPattern, private val matcher: org.joni.Matcher) {
	private var position = -1
	private var region: IntArray? = null

	/**
	 * Ports `searchOnigRegExp`: a search from a later position reuses the
	 * last result while it starts at or after that position, except for
	 * patterns with `\G`, whose matches depend on where the search starts.
	 * Kept per string rather than per scanner, so the many scanners sharing a
	 * pattern (every TypeScript rule that includes `#expression`) share its
	 * results too.
	 */
	fun search(string: OnigString, position: Int): IntArray? {
		if (!pattern.hasGAnchor && this.position in 0..position) {
			val last = region ?: return null
			if (last[0] >= position) return last
		}
		this.position = position
		return pattern.search(matcher, string.utf8, string.utf8Length, position, position).also { region = it }
	}
}

/** Thrown when a grammar's pattern doesn't compile. */
class TextMateRegexException(val pattern: String, cause: Throwable) :
	RuntimeException("Couldn't compile TextMate pattern /$pattern/: ${cause.message}", cause)

/**
 * Searches several patterns at once, ported from vscode-oniguruma's
 * `findNextOnigScannerMatch`: the match starting leftmost wins, ties going
 * to the lowest pattern index.
 *
 * For strings under 1000 UTF-8 bytes vscode-oniguruma searches with
 * Oniguruma's RegSet (`ONIG_REGSET_POSITION_LEAD`), which tries a pattern
 * the optimizer anchors on a leading `.*` ([OnigPattern.anycharStar]) only
 * at the search start and after a newline; mirrored here. Otherwise each
 * pattern is searched alone, its result cached on the string as
 * vscode-oniguruma's `searchOnigRegExp` caches it for long strings (see
 * [CachedSearch]); caching never changes a result, so it's used for
 * every string.
 *
 * Not thread-safe: every grammar instance has its own scanners.
 */
internal class OnigScanner(patterns: List<String>) {
	private val compiled = Array(patterns.size) { OnigPattern.get(patterns[it]) }

	// each pattern's cached search of the string last searched
	private var searchesStringId = 0
	private val searches = arrayOfNulls<CachedSearch>(patterns.size)

	fun findNextMatch(string: OnigString, startPosition: Int): OnigMatch? {
		val position = string.utf16ToUtf8(startPosition)
		val regSet = string.utf8Length < 1000
		if (searchesStringId != string.id) {
			searches.fill(null)
			searchesStringId = string.id
		}
		var bestIndex = -1
		var bestLocation = 0
		var bestRegion: IntArray? = null
		for (i in compiled.indices) {
			val pattern = compiled[i]
			val region =
				if (regSet && pattern.anycharStar) searchLineStarts(pattern, string, position)
				else (searches[i] ?: string.cachedSearch(pattern).also { searches[i] = it }).search(string, position)
			if (region == null) continue
			val location = region[0]
			if (bestIndex == -1 || location < bestLocation) {
				bestLocation = location
				bestIndex = i
				bestRegion = region
			}
			if (location == position) break
		}
		val region = bestRegion ?: return null
		val captures =
			Array(region.size / 2) {
				val beg = region[it * 2]
				if (beg < 0) CaptureIndex(-1, -1)
				else CaptureIndex(string.utf8ToUtf16(beg), string.utf8ToUtf16(region[it * 2 + 1]))
			}
		return OnigMatch(bestIndex, captures)
	}

	/** The RegSet search of an `.*`-anchored pattern: only at [position] and after each newline. */
	private fun searchLineStarts(pattern: OnigPattern, string: OnigString, position: Int): IntArray? {
		val bytes = string.utf8
		val end = string.utf8Length
		pattern.matchAt(bytes, end, position)?.let { return it }
		for (at in position until end) {
			if (bytes[at] == '\n'.code.toByte()) pattern.matchAt(bytes, end, at + 1)?.let { return it }
		}
		return null
	}
}

