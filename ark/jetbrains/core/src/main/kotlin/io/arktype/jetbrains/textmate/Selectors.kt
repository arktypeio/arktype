package io.arktype.jetbrains.textmate

// Ports vscode-textmate's src/matcher.ts (scope selectors) and the
// `nameMatcher` grammar.ts parses injection selectors with.

internal typealias ScopeMatcher = (scopes: List<String>) -> Boolean

/** One comma-separated alternative of a selector, and its `L:`/`R:` priority (-1, 0 or 1). */
internal class PrioritizedMatcher(@JvmField val matcher: ScopeMatcher, @JvmField val priority: Int)

private val selectorToken = Regex("""([LR]:|[\w.:][\w.:\-]*|[,|\-()])""")
private val identifierChars = Regex("""[\w.:]+""")

private fun isIdentifier(token: String?): Boolean = token != null && identifierChars.containsMatchIn(token)

/** Ports `createMatchers`, with `nameMatcher` as the matcher for identifier sequences. */
internal fun createMatchers(selector: String): List<PrioritizedMatcher> {
	val tokens = selectorToken.findAll(selector).map { it.value }.iterator()
	var token: String? = if (tokens.hasNext()) tokens.next() else null
	fun next() {
		token = if (tokens.hasNext()) tokens.next() else null
	}

	lateinit var parseInnerExpression: () -> ScopeMatcher

	fun parseOperand(): ScopeMatcher? {
		val current = token
		if (current == "-") {
			next()
			val negated = parseOperand()
			return { scopes -> negated != null && !negated(scopes) }
		}
		if (current == "(") {
			next()
			val inner = parseInnerExpression()
			if (token == ")") next()
			return inner
		}
		if (current != null && isIdentifier(current)) {
			val identifiers = ArrayList<String>()
			var identifier: String? = current
			while (identifier != null && isIdentifier(identifier)) {
				identifiers.add(identifier)
				next()
				identifier = token
			}
			return { scopes -> nameMatcher(identifiers, scopes) }
		}
		return null
	}

	fun parseConjunction(): ScopeMatcher {
		val matchers = ArrayList<ScopeMatcher>()
		var matcher = parseOperand()
		while (matcher != null) {
			matchers.add(matcher)
			matcher = parseOperand()
		}
		return { scopes -> matchers.all { it(scopes) } }
	}

	parseInnerExpression = {
		val matchers = ArrayList<ScopeMatcher>()
		while (true) {
			matchers.add(parseConjunction())
			if (token == "|" || token == ",") {
				do next() while (token == "|" || token == ",")
			} else break
		}
		val result: ScopeMatcher = { scopes -> matchers.any { it(scopes) } }
		result
	}

	val results = ArrayList<PrioritizedMatcher>()
	while (true) {
		val current = token ?: break
		var priority = 0
		if (current.length == 2 && current[1] == ':') {
			priority =
				when (current[0]) {
					'R' -> 1
					'L' -> -1
					else -> 0
				}
			next()
		}
		results.add(PrioritizedMatcher(parseConjunction(), priority))
		if (token != ",") break
		next()
	}
	return results
}

/** Ports grammar.ts's `nameMatcher`: each identifier matches a later scope, in order. */
internal fun nameMatcher(identifiers: List<String>, scopes: List<String>): Boolean {
	if (scopes.size < identifiers.size) return false
	var lastIndex = 0
	return identifiers.all { identifier ->
		for (i in lastIndex until scopes.size) {
			if (scopesAreMatching(scopes[i], identifier)) {
				lastIndex = i + 1
				return@all true
			}
		}
		false
	}
}

private fun scopesAreMatching(thisScopeName: String, scopeName: String): Boolean {
	if (thisScopeName.isEmpty()) return false
	if (thisScopeName == scopeName) return true
	val len = scopeName.length
	return thisScopeName.length > len && thisScopeName.startsWith(scopeName) && thisScopeName[len] == '.'
}
