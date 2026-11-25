package io.arktype.jetbrains.textmate

/**
 * Strings at least one of which every match of a pattern contains, found
 * from its parse, or null if there are none worth checking. A search can
 * skip the regex when none of them occurs past its start position: a cheap
 * proof that it can't match, which matters for patterns like the ArkType
 * injection's `([^\)\(\s]+)?(\.)?\b(type|...)(\()`, searched on every line
 * and costly to run on each.
 *
 * Case-insensitive patterns and anything the parser can't read get none.
 */
internal fun requiredLiterals(source: String): List<ByteArray>? {
	if (Regex("""\(\?[a-z]*i""").containsMatchIn(source)) return null
	val parsed =
		try {
			RegexParser(source).parse()
		} catch (_: Exception) {
			return null
		}
	val literals = required(parsed.root) ?: return null
	if (literals.isEmpty() || literals.any { it.isEmpty() }) return null
	return literals.map { it.toByteArray(Charsets.UTF_8) }
}

private const val MAX_LITERALS = 16

/** The literal character an atom always matches, if it's one. */
private fun literalChar(atom: RegexNode.Atom): String? {
	val text = atom.text
	if (text.length == 1 && text[0] !in ".^$[") return text
	if (text.length == 2 && Character.isSurrogatePair(text[0], text[1])) return text
	if (text.length == 2 && text[0] == '\\') {
		val c = text[1]
		return when {
			c == 'n' -> "\n"
			c == 't' -> "\t"
			!c.isLetterOrDigit() -> c.toString()
			else -> null
		}
	}
	return null
}

/** The better of two requirements: the one whose shortest string is longest. */
private fun better(a: Set<String>?, b: Set<String>?): Set<String>? {
	if (a == null) return b
	if (b == null) return a
	return if ((b.minOfOrNull { it.length } ?: 0) > (a.minOfOrNull { it.length } ?: 0)) b else a
}

private fun required(node: RegexNode): Set<String>? =
	when (node) {
		is RegexNode.Alternation -> {
			val result = HashSet<String>()
			for (alternative in node.alternatives) result += required(alternative) ?: return null
			if (result.size > MAX_LITERALS) null else result
		}
		is RegexNode.Sequence -> {
			var best: Set<String>? = null
			val run = StringBuilder()
			for (item in node.items) {
				val char = (item as? RegexNode.Atom)?.let(::literalChar)
				if (char != null) {
					run.append(char)
					continue
				}
				if (run.isNotEmpty()) best = better(best, setOf(run.toString()))
				run.clear()
				best = better(best, required(item))
			}
			if (run.isNotEmpty()) best = better(best, setOf(run.toString()))
			best
		}
		is RegexNode.Atom -> literalChar(node)?.let { setOf(it) }
		is RegexNode.Group ->
			when (node.kind) {
				// a look-ahead's text follows the match's start too
				GroupKind.Capturing, GroupKind.NonCapturing, GroupKind.Atomic, GroupKind.Lookahead -> required(node.body)
				GroupKind.Options -> if ('i' in node.open.substringBefore('-')) null else required(node.body)
				else -> null
			}
		is RegexNode.Quantified -> if (node.min >= 1) required(node.atom) else null
		is RegexNode.Reference -> null
	}

/** Whether any of [literals] occurs in [bytes] between [from] and [end]. */
internal fun containsAny(bytes: ByteArray, from: Int, end: Int, literals: List<ByteArray>): Boolean {
	for (literal in literals) {
		val first = literal[0]
		var i = from
		val last = end - literal.size
		outer@ while (i <= last) {
			if (bytes[i] == first) {
				for (k in 1 until literal.size) if (bytes[i + k] != literal[k]) {
					i++
					continue@outer
				}
				return true
			}
			i++
		}
	}
	return false
}
