package io.arktype.jetbrains.textmate

/**
 * Rewrites look-behinds Oniguruma 6.9 accepts and joni rejects into
 * equivalents joni compiles.
 *
 * joni (like Oniguruma before 6.9.6) needs every top-level alternative of a
 * look-behind to have one fixed length. So a look-behind whose alternatives
 * nest groups of different lengths, or bounded quantifiers, is expanded into
 * the fixed-length alternatives it stands for:
 * `(?<!(?:^|[^.])import)` → `(?<!^import|[^.]import)`. A group inside is
 * copied into each alternative, so the result has more groups than the
 * original; [Rewritten.groupMap] maps them back, and back-references are
 * renumbered.
 *
 * An unbounded look-behind (`(?<=each.*?)\G`) can't be expanded. When it
 * leads the pattern, it becomes a [Prefix] that [OnigPattern] checks where
 * each match starts. Elsewhere, its unbounded repeats are expanded up to
 * [APPROXIMATE_REPEAT] times, the one inexact rewrite. A pattern no rule
 * covers can have a hand-proven equivalent in [overrides].
 *
 * Patterns joni compiles as they are never come here.
 */
internal object LookbehindRewriter {
	/** [body] compiles on its own with [options] (the pattern's leading `(?i)`) before it. */
	class Prefix(val options: String, val body: String, val negative: Boolean, val groups: IntRange)

	class Rewritten(val pattern: String, val groupMap: IntArray, val originalGroups: Int, val prefix: Prefix?)

	/** A hand-written equivalent, and the original group each of its groups stands for. */
	private class Override(val pattern: String, val groupMap: IntArray)

	/** Exact rewrites of patterns no general rule covers, each proven equivalent in its comment. */
	private val overrides: Map<String, Override> =
		mapOf(
			// Markdown's strikethrough. Where the look-behind runs, the text
			// before it ends in `\1` (just matched by group 3), so `(?<=_\1)`
			// only asks whether `_` precedes group 3: `(?!(?<=_\1)\w)` after
			// group 3 holds when no `_` precedes it, or no word character
			// follows it. Group 3 is copied; both copies are group 3.
			"(?<!\\\\)(~{2,})(?!(?<=\\w~~)_)((?:[^~]|(?!(?<![\\\\~])\\1(?!~))~)*+)(\\1)(?!(?<=_\\1)\\w)" to
				Override(
					"(?<!\\\\)(~{2,})(?!(?<=\\w~~)_)((?:[^~]|(?!(?<![\\\\~])\\1(?!~))~)*+)(?:(?<!_)(\\1)|(\\1)(?!\\w))",
					intArrayOf(0, 1, 2, 3, 3)
				)
		)

	private val leadingOptions = Regex("""^\(\?[im]*(?:-[im]*)?\)""")

	fun rewrite(source: String): Rewritten? {
		overrides[source]?.let { return Rewritten(it.pattern, it.groupMap, it.groupMap.max(), null) }
		// a leading `(?i)` applies to the whole pattern, so it's kept as is
		val options = leadingOptions.find(source)?.value ?: ""
		val parsed = RegexParser(source.substring(options.length)).parse()
		val originalGroups = parsed.groupCount
		var prefix: Prefix? = null
		val top = parsed.root
		val first = top.alternatives.singleOrNull()?.items?.firstOrNull()
		if (first is RegexNode.Group && first.isLookbehind && expand(first.body) == null) {
			val groupsInside = captures(first)
			if (groupsInside.any { it != groupsInside.first() + groupsInside.indexOf(it) }) return null
			val range = if (groupsInside.isEmpty()) IntRange.EMPTY else groupsInside.first()..groupsInside.last()
			if (references(first.body).isNotEmpty()) return null
			prefix = Prefix(options, emitPlain(first.body), first.kind == GroupKind.NegativeLookbehind, range)
		}
		val out = Emitter()
		out.append(options, emptyList())
		if (prefix != null) {
			// keep the look-behind's groups as empty placeholders, filled by the check
			for (group in prefix.groups) out.append("()", listOf(group))
			emitAlternation(RegexNode.Alternation(listOf(RegexNode.Sequence(top.alternatives[0].items.drop(1)))), out)
		} else {
			emitAlternation(top, out)
		}
		val groupMap = IntArray(out.groups.size + 1)
		out.groups.forEachIndexed { i, original -> groupMap[i + 1] = original }
		val pattern = out.resolveReferences(groupMap) ?: return null
		return Rewritten(pattern, groupMap, originalGroups, prefix)
	}

	/** Rewritten text and, in order, the original group each of its groups stands for. */
	private class Emitter {
		val text = StringBuilder()
		val groups = ArrayList<Int>()

		fun append(fragment: String, fragmentGroups: List<Int>) {
			text.append(fragment)
			groups += fragmentGroups
		}

		/** Back-references were emitted as markers; point them at the groups' new numbers. */
		fun resolveReferences(groupMap: IntArray): String? {
			var failed = false
			val result =
				Regex("\u0000(\\d+)\u0000").replace(text) { match ->
					val original = match.groupValues[1].toInt()
					val copies = (1 until groupMap.size).filter { groupMap[it] == original }
					if (copies.size != 1) {
						failed = true
						""
					} else {
						"\\k<${copies[0]}>"
					}
				}
			return if (failed) null else result
		}
	}

	private class Fragment(val text: String, val groups: List<Int>)

	private const val MAX_ALTERNATIVES = 512

	/**
	 * How many repeats an unbounded quantifier in a look-behind that isn't
	 * the pattern's prefix is expanded to. Inexact beyond it: TypeScript's
	 * `(?<!(?:^|[^$._[:alnum:]]|^await\s+|[^$._[:alnum:]]await\s+)using)` only
	 * misjudges `await` and `using` more than this many spaces apart.
	 */
	const val APPROXIMATE_REPEAT = 64

	/** The fixed-length alternatives [node] stands for, or null if it has none (it repeats without bound). */
	private fun expand(node: RegexNode, approximate: Boolean = false): List<Fragment>? =
		when (node) {
			is RegexNode.Alternation -> {
				val result = ArrayList<Fragment>()
				for (alternative in node.alternatives) result += expand(alternative, approximate) ?: return null
				if (result.size > MAX_ALTERNATIVES) null else result
			}
			is RegexNode.Sequence -> {
				var result = listOf(Fragment("", emptyList()))
				for (item in node.items) {
					val options = expand(item, approximate) ?: return null
					result = result.flatMap { a -> options.map { b -> Fragment(a.text + b.text, a.groups + b.groups) } }
					if (result.size > MAX_ALTERNATIVES) return null
				}
				result
			}
			is RegexNode.Atom -> if (node.fixedWidth) listOf(Fragment(node.text, emptyList())) else null
			is RegexNode.Reference -> null
			is RegexNode.Group ->
				when (node.kind) {
					GroupKind.NonCapturing -> expand(node.body, approximate)
					GroupKind.Capturing ->
						expand(node.body, approximate)?.map { Fragment("(${it.text})", listOf(node.number) + it.groups) }
					GroupKind.Options, GroupKind.Atomic ->
						expand(node.body, approximate)?.map { Fragment("${node.open}${it.text})", it.groups) }
					GroupKind.Lookahead, GroupKind.NegativeLookahead, GroupKind.Lookbehind, GroupKind.NegativeLookbehind -> {
						if (captures(node).isNotEmpty()) null
						else {
							val out = Emitter()
							emitNode(node, out)
							listOf(Fragment(out.text.toString(), emptyList()))
						}
					}
					GroupKind.Other -> null
				}
			is RegexNode.Quantified -> {
				val max = node.max ?: if (approximate) node.min + APPROXIMATE_REPEAT else null
				val atom = if (max == null) null else expand(node.atom, approximate)
				if (max == null || atom == null || (max > 1 && atom.any { it.groups.isNotEmpty() })) null
				else if (atom.size > 1 && max > 16) null
				else {
					val counts = if (node.lazy) node.min..max else max downTo node.min
					val result = ArrayList<Fragment>()
					for (count in counts) {
						val single = atom.singleOrNull()
						if (single != null) {
							result +=
								Fragment(
									when (count) {
										0 -> ""
										1 -> single.text
										else -> "(?:${single.text}){$count}"
									},
									if (count == 0) emptyList() else single.groups
								)
						} else {
							var repeated = listOf(Fragment("", emptyList()))
							repeat(count) {
								repeated = repeated.flatMap { a -> atom.map { b -> Fragment(a.text + b.text, a.groups + b.groups) } }
							}
							result += repeated
						}
						if (result.size > MAX_ALTERNATIVES) return null
					}
					result
				}
			}
		}

	private fun emitAlternation(node: RegexNode.Alternation, out: Emitter) {
		node.alternatives.forEachIndexed { i, alternative ->
			if (i > 0) out.append("|", emptyList())
			for (item in alternative.items) emitNode(item, out)
		}
	}

	private fun emitNode(node: RegexNode, out: Emitter) {
		when (node) {
			is RegexNode.Alternation -> emitAlternation(node, out)
			is RegexNode.Sequence -> node.items.forEach { emitNode(it, out) }
			is RegexNode.Atom -> out.append(node.text, emptyList())
			is RegexNode.Reference -> out.append("\u0000${node.group}\u0000", emptyList())
			is RegexNode.Quantified -> {
				emitNode(node.atom, out)
				out.append(node.quantifier, emptyList())
			}
			is RegexNode.Group -> {
				if (node.isLookbehind) {
					// an unbounded repeat only Oniguruma 6.9 allows here is cut off
					// at APPROXIMATE_REPEAT: the one inexact rewrite
					val expanded = expand(node.body) ?: expand(node.body, approximate = true)
					if (expanded != null) {
						out.append(node.open, emptyList())
						expanded.forEachIndexed { i, fragment ->
							if (i > 0) out.append("|", emptyList())
							out.append(fragment.text, fragment.groups)
						}
						out.append(")", emptyList())
						return
					}
				}
				out.append(node.open, if (node.kind == GroupKind.Capturing) listOf(node.number) else emptyList())
				emitAlternation(node.body, out)
				out.append(")", emptyList())
			}
		}
	}

	/** [node]'s text with its own groups numbered from 1, for compiling on its own. */
	private fun emitPlain(node: RegexNode.Alternation): String {
		val out = Emitter()
		emitAlternation(node, out)
		return out.text.toString()
	}

	private fun captures(node: RegexNode): List<Int> =
		when (node) {
			is RegexNode.Alternation -> node.alternatives.flatMap { captures(it) }
			is RegexNode.Sequence -> node.items.flatMap { captures(it) }
			is RegexNode.Group -> (if (node.kind == GroupKind.Capturing) listOf(node.number) else emptyList()) + captures(node.body)
			is RegexNode.Quantified -> captures(node.atom)
			else -> emptyList()
		}

	private fun references(node: RegexNode): List<Int> =
		when (node) {
			is RegexNode.Alternation -> node.alternatives.flatMap { references(it) }
			is RegexNode.Sequence -> node.items.flatMap { references(it) }
			is RegexNode.Group -> references(node.body)
			is RegexNode.Quantified -> references(node.atom)
			is RegexNode.Reference -> listOf(node.group)
			else -> emptyList()
		}
}

internal enum class GroupKind {
	NonCapturing,
	Capturing,
	Options,
	Atomic,
	Lookahead,
	NegativeLookahead,
	Lookbehind,
	NegativeLookbehind,

	/** absent `(?~`, conditionals, anything else this parser only passes through */
	Other
}

internal sealed interface RegexNode {
	class Alternation(val alternatives: List<Sequence>) : RegexNode

	class Sequence(val items: List<RegexNode>) : RegexNode

	/** A character, class, escape or anchor, with whether it always matches one character or none. */
	class Atom(val text: String, val fixedWidth: Boolean) : RegexNode

	/** A numbered back-reference, re-emitted as `\k<n>` once groups are renumbered. */
	class Reference(val group: Int) : RegexNode

	class Group(val kind: GroupKind, val open: String, val number: Int, val body: Alternation) : RegexNode {
		val isLookbehind get() = kind == GroupKind.Lookbehind || kind == GroupKind.NegativeLookbehind
	}

	class Quantified(val atom: RegexNode, val quantifier: String, val min: Int, val max: Int?, val lazy: Boolean) : RegexNode
}

internal class ParsedRegex(val root: RegexNode.Alternation, val groupCount: Int)

/**
 * Parses Oniguruma's syntax as far as [LookbehindRewriter] needs: groups and
 * their numbers, alternation, quantifiers, and atoms opaque but for whether
 * they're fixed-width. Throws on anything it doesn't understand (extended
 * mode, inline option switches), so the rewriter leaves such patterns alone.
 */
internal class RegexParser(private val source: String) {
	private var pos = 0
	private var groupCount = 0

	fun parse(): ParsedRegex {
		val root = parseAlternation()
		if (pos != source.length) error("Unbalanced ) at $pos")
		return ParsedRegex(root, groupCount)
	}

	private fun parseAlternation(): RegexNode.Alternation {
		val alternatives = ArrayList<RegexNode.Sequence>()
		alternatives += parseSequence()
		while (pos < source.length && source[pos] == '|') {
			pos++
			alternatives += parseSequence()
		}
		return RegexNode.Alternation(alternatives)
	}

	private fun parseSequence(): RegexNode.Sequence {
		val items = ArrayList<RegexNode>()
		while (pos < source.length && source[pos] != '|' && source[pos] != ')') {
			var atom = parseAtom()
			while (pos < source.length) atom = parseQuantifier(atom) ?: break
			items += atom
		}
		return RegexNode.Sequence(items)
	}

	private fun parseQuantifier(atom: RegexNode): RegexNode? {
		val start = pos
		val (min, max) =
			when (source[pos]) {
				'*' -> {
					pos++
					0 to null
				}
				'+' -> {
					pos++
					1 to null
				}
				'?' -> {
					pos++
					0 to 1
				}
				'{' -> {
					val match = Regex("""\{(\d*)(?:(,)(\d*))?}""").matchAt(source, pos) ?: return null
					val low = match.groupValues[1]
					val comma = match.groupValues[2]
					val high = match.groupValues[3]
					if (low.isEmpty() && high.isEmpty()) return null
					pos += match.value.length
					val min = low.toIntOrNull() ?: 0
					min to (if (comma.isEmpty()) min else high.toIntOrNull())
				}
				else -> return null
			}
		var lazy = false
		if (pos < source.length && source[pos] == '?') {
			lazy = true
			pos++
		} else if (pos < source.length && source[pos] == '+' && source[start] != '{') {
			// possessive; as an atom it can't be expanded
			pos++
			return RegexNode.Quantified(atom, source.substring(start, pos), min, null, false)
		}
		return RegexNode.Quantified(atom, source.substring(start, pos), min, max, lazy)
	}

	private fun parseAtom(): RegexNode {
		val c = source[pos]
		return when (c) {
			'(' -> parseGroup()
			'[' -> {
				val start = pos
				skipClass()
				RegexNode.Atom(source.substring(start, pos), true)
			}
			'\\' -> parseEscape()
			'^', '$' -> {
				pos++
				RegexNode.Atom(c.toString(), false).zeroWidth()
			}
			else -> {
				val start = pos
				pos += if (Character.isHighSurrogate(c) && pos + 1 < source.length) 2 else 1
				RegexNode.Atom(source.substring(start, pos), true)
			}
		}
	}

	/** Anchors and other zero-width atoms expand to themselves too. */
	private fun RegexNode.Atom.zeroWidth() = RegexNode.Atom(text, true)

	private fun parseEscape(): RegexNode {
		val start = pos
		pos++
		if (pos >= source.length) error("Trailing backslash")
		val c = source[pos]
		pos++
		when (c) {
			in '1'..'9' -> {
				while (pos < source.length && source[pos].isDigit()) pos++
				return RegexNode.Reference(source.substring(start + 1, pos).toInt())
			}
			'k' -> {
				val match = Regex("""<(\d+)>""").matchAt(source, pos)
				if (match != null) {
					pos += match.value.length
					return RegexNode.Reference(match.groupValues[1].toInt())
				}
				val named = Regex("""<[^>]*>|'[^']*'""").matchAt(source, pos) ?: error("Bad \\k")
				pos += named.value.length
				return RegexNode.Atom(source.substring(start, pos), false)
			}
			'g' -> {
				val call = Regex("""<[^>]*>|'[^']*'""").matchAt(source, pos) ?: error("Bad \\g")
				pos += call.value.length
				return RegexNode.Atom(source.substring(start, pos), false)
			}
			'x' -> {
				val match = Regex("""\{[0-9a-fA-F]+}|[0-9a-fA-F]{0,2}""").matchAt(source, pos)
				if (match != null) pos += match.value.length
			}
			'u' -> {
				val match = Regex("""[0-9a-fA-F]{4}""").matchAt(source, pos)
				if (match != null) pos += match.value.length
			}
			'0' -> {
				val match = Regex("""[0-7]{0,2}""").matchAt(source, pos)
				if (match != null) pos += match.value.length
			}
			'p', 'P' -> {
				val match = Regex("""\{\^?[\w\s-]+}""").matchAt(source, pos) ?: error("Bad property")
				pos += match.value.length
			}
			'c' -> pos++
			'C', 'M' -> {
				// \C-x, \M-x
				pos += 2
			}
			'A', 'z', 'Z', 'G', 'b', 'B', 'y', 'Y' -> return RegexNode.Atom(source.substring(start, pos), true)
			'X', 'R', 'K', 'O' -> return RegexNode.Atom(source.substring(start, pos), false)
		}
		return RegexNode.Atom(source.substring(start, pos), true)
	}

	private fun skipClass() {
		pos++ // [
		if (pos < source.length && source[pos] == '^') pos++
		if (pos < source.length && source[pos] == ']') pos++
		while (pos < source.length) {
			when (source[pos]) {
				'\\' -> pos += 2
				'[' -> {
					val posix = Regex("""\[:\^?\w+:]""").matchAt(source, pos)
					if (posix != null) pos += posix.value.length else skipClass()
				}
				']' -> {
					pos++
					return
				}
				else -> pos++
			}
		}
		error("Unterminated class")
	}

	private fun parseGroup(): RegexNode {
		val start = pos
		pos++
		val kind: GroupKind
		var number = 0
		if (source.startsWith("?", pos)) {
			when {
				source.startsWith("?:", pos) -> {
					pos += 2
					kind = GroupKind.NonCapturing
				}
				source.startsWith("?=", pos) -> {
					pos += 2
					kind = GroupKind.Lookahead
				}
				source.startsWith("?!", pos) -> {
					pos += 2
					kind = GroupKind.NegativeLookahead
				}
				source.startsWith("?<=", pos) -> {
					pos += 3
					kind = GroupKind.Lookbehind
				}
				source.startsWith("?<!", pos) -> {
					pos += 3
					kind = GroupKind.NegativeLookbehind
				}
				source.startsWith("?>", pos) -> {
					pos += 2
					kind = GroupKind.Atomic
				}
				source.startsWith("?#", pos) -> {
					val close = source.indexOf(')', pos)
					if (close == -1) error("Unterminated comment")
					pos = close + 1
					return RegexNode.Atom(source.substring(start, pos), true)
				}
				source.startsWith("?<", pos) || source.startsWith("?'", pos) || source.startsWith("?P<", pos) -> {
					val close = source.indexOfAny(charArrayOf('>', '\''), pos + 2)
					if (close == -1) error("Unterminated group name")
					pos = close + 1
					kind = GroupKind.Capturing
					number = ++groupCount
				}
				else -> {
					val options = Regex("""\?[imx]*(?:-[imx]*)?([:)])""").matchAt(source, pos)
					if (options != null) {
						if (options.groupValues[1] == ")") error("Inline option switch")
						if ('x' in options.value.substringBefore('-')) error("Extended mode")
						pos += options.value.length
						kind = GroupKind.Options
					} else {
						pos++
						kind = GroupKind.Other
					}
				}
			}
		} else {
			kind = GroupKind.Capturing
			number = ++groupCount
		}
		val open = source.substring(start, pos)
		val body = parseAlternation()
		if (pos >= source.length || source[pos] != ')') error("Unterminated group")
		pos++
		return RegexNode.Group(kind, open, number, body)
	}
}
