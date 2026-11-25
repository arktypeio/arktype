package io.arktype.jetbrains.textmate

// Ports vscode-textmate's src/rule.ts and the helpers it uses from utils.ts.

internal const val END_RULE_ID = -1
internal const val WHILE_RULE_ID = -2

/** JavaScript's `String.prototype.substring`: clamps and orders its bounds. */
internal fun String.jsSubstring(start: Int, end: Int): String {
	val a = start.coerceIn(0, length)
	val b = end.coerceIn(0, length)
	return if (a <= b) substring(a, b) else substring(b, a)
}

/** Ports `RegexSource`: `$n` and `${n:/downcase}` references to captures in names. */
internal object RegexSource {
	private val capturing = Regex("""\$(\d+)|\$\{(\d+):/(downcase|upcase)\}""")

	fun hasCaptures(source: String?): Boolean = source != null && capturing.containsMatchIn(source)

	fun replaceCaptures(source: String, captureSource: String, captureIndices: Array<CaptureIndex>): String =
		capturing.replace(source) { match ->
			val index = (match.groups[1] ?: match.groups[2])?.value?.toIntOrNull()
			val capture = if (index != null && index < captureIndices.size) captureIndices[index] else null
			if (capture == null) match.value
			else {
				var result = captureSource.jsSubstring(capture.start, capture.end)
				while (result.startsWith(".")) result = result.substring(1)
				when (match.groups[3]?.value) {
					"downcase" -> result.lowercase()
					"upcase" -> result.uppercase()
					else -> result
				}
			}
		}
}

/** JavaScript's `\s`, which the escape below matches. */
private fun isJsWhitespace(c: Char): Boolean =
	c == '\t' || c == '\n' || c == '\u000B' || c == '\u000C' || c == '\r' || c == ' ' || c == '\u00A0' ||
		c == '\u1680' || c in '\u2000'..'\u200A' || c == '\u2028' || c == '\u2029' || c == '\u202F' ||
		c == '\u205F' || c == '\u3000' || c == '\uFEFF'

/** Ports `escapeRegExpCharacters`. */
internal fun escapeRegExpCharacters(value: String): String {
	val sb = StringBuilder(value.length + 8)
	for (c in value) {
		if ("-\\{}*+?|^$.,[]()#".indexOf(c) != -1 || isJsWhitespace(c)) sb.append('\\')
		sb.append(c)
	}
	return sb.toString()
}

internal abstract class Rule(@JvmField val id: Int, name: String?, contentName: String?) {
	private val name: String? = name
	private val nameIsCapturing = RegexSource.hasCaptures(name)
	private val contentName: String? = contentName
	private val contentNameIsCapturing = RegexSource.hasCaptures(contentName)

	fun getName(lineText: String?, captureIndices: Array<CaptureIndex>?): String? {
		if (!nameIsCapturing || name == null || lineText == null || captureIndices == null) return name
		return RegexSource.replaceCaptures(name, lineText, captureIndices)
	}

	fun getContentName(lineText: String, captureIndices: Array<CaptureIndex>): String? {
		if (!contentNameIsCapturing || contentName == null) return contentName
		return RegexSource.replaceCaptures(contentName, lineText, captureIndices)
	}

	abstract fun collectPatterns(grammar: Grammar, out: RegExpSourceList)

	abstract fun compileAG(grammar: Grammar, endRegexSource: String?, allowA: Boolean, allowG: Boolean): CompiledRule
}

internal class CaptureRule(id: Int, name: String?, contentName: String?, @JvmField val retokenizeCapturedWithRuleId: Int) :
	Rule(id, name, contentName) {
	override fun collectPatterns(grammar: Grammar, out: RegExpSourceList) = throw UnsupportedOperationException()

	override fun compileAG(grammar: Grammar, endRegexSource: String?, allowA: Boolean, allowG: Boolean) =
		throw UnsupportedOperationException()
}

/** A rule whose patterns compile into one scanner, cached on first use. */
internal interface HasPatterns {
	val patterns: IntArray
	val hasMissingPatterns: Boolean
}

internal class MatchRule(id: Int, name: String?, match: String, @JvmField val captures: Array<CaptureRule?>) :
	Rule(id, name, null) {
	private val match = RegExpSource(match, id)
	private var cached: RegExpSourceList? = null

	override fun collectPatterns(grammar: Grammar, out: RegExpSourceList) = out.push(match)

	override fun compileAG(grammar: Grammar, endRegexSource: String?, allowA: Boolean, allowG: Boolean): CompiledRule {
		val list = cached ?: RegExpSourceList().also { collectPatterns(grammar, it); cached = it }
		return list.compileAG(allowA, allowG)
	}
}

internal class IncludeOnlyRule(id: Int, name: String?, contentName: String?, compiled: CompiledPatterns) :
	Rule(id, name, contentName),
	HasPatterns {
	override val patterns = compiled.patterns
	override val hasMissingPatterns = compiled.hasMissingPatterns
	private var cached: RegExpSourceList? = null

	override fun collectPatterns(grammar: Grammar, out: RegExpSourceList) {
		for (pattern in patterns) grammar.getRule(pattern).collectPatterns(grammar, out)
	}

	override fun compileAG(grammar: Grammar, endRegexSource: String?, allowA: Boolean, allowG: Boolean): CompiledRule {
		val list = cached ?: RegExpSourceList().also { collectPatterns(grammar, it); cached = it }
		return list.compileAG(allowA, allowG)
	}
}

internal class BeginEndRule(
	id: Int,
	name: String?,
	contentName: String?,
	begin: String?,
	@JvmField val beginCaptures: Array<CaptureRule?>,
	end: String?,
	@JvmField val endCaptures: Array<CaptureRule?>,
	private val applyEndPatternLast: Boolean,
	compiled: CompiledPatterns
) : Rule(id, name, contentName),
	HasPatterns {
	private val begin = RegExpSource(begin, id)
	private val end = RegExpSource(end ?: "\uFFFF", END_RULE_ID)
	@JvmField val endHasBackReferences = this.end.hasBackReferences
	override val patterns = compiled.patterns
	override val hasMissingPatterns = compiled.hasMissingPatterns
	private var cached: RegExpSourceList? = null

	fun getEndWithResolvedBackReferences(lineText: String, captureIndices: Array<CaptureIndex>) =
		end.resolveBackReferences(lineText, captureIndices)

	override fun collectPatterns(grammar: Grammar, out: RegExpSourceList) = out.push(begin)

	override fun compileAG(grammar: Grammar, endRegexSource: String?, allowA: Boolean, allowG: Boolean): CompiledRule =
		getCachedCompiledPatterns(grammar, endRegexSource).compileAG(allowA, allowG)

	private fun getCachedCompiledPatterns(grammar: Grammar, endRegexSource: String?): RegExpSourceList {
		val list =
			cached
				?: RegExpSourceList().also { list ->
					for (pattern in patterns) grammar.getRule(pattern).collectPatterns(grammar, list)
					val endSource = if (end.hasBackReferences) end.clone() else end
					if (applyEndPatternLast) list.push(endSource) else list.unshift(endSource)
					cached = list
				}
		if (end.hasBackReferences) {
			list.setSource(if (applyEndPatternLast) list.length - 1 else 0, endRegexSource)
		}
		return list
	}
}

internal class BeginWhileRule(
	id: Int,
	name: String?,
	contentName: String?,
	begin: String?,
	@JvmField val beginCaptures: Array<CaptureRule?>,
	whilePattern: String,
	@JvmField val whileCaptures: Array<CaptureRule?>,
	compiled: CompiledPatterns
) : Rule(id, name, contentName),
	HasPatterns {
	private val begin = RegExpSource(begin, id)
	private val whileSource = RegExpSource(whilePattern, WHILE_RULE_ID)
	@JvmField val whileHasBackReferences = whileSource.hasBackReferences
	override val patterns = compiled.patterns
	override val hasMissingPatterns = compiled.hasMissingPatterns
	private var cached: RegExpSourceList? = null
	private var cachedWhile: RegExpSourceList? = null

	fun getWhileWithResolvedBackReferences(lineText: String, captureIndices: Array<CaptureIndex>) =
		whileSource.resolveBackReferences(lineText, captureIndices)

	override fun collectPatterns(grammar: Grammar, out: RegExpSourceList) = out.push(begin)

	override fun compileAG(grammar: Grammar, endRegexSource: String?, allowA: Boolean, allowG: Boolean): CompiledRule {
		val list =
			cached
				?: RegExpSourceList().also { list ->
					for (pattern in patterns) grammar.getRule(pattern).collectPatterns(grammar, list)
					cached = list
				}
		return list.compileAG(allowA, allowG)
	}

	fun compileWhileAG(endRegexSource: String?, allowA: Boolean, allowG: Boolean): CompiledRule {
		val list =
			cachedWhile
				?: RegExpSourceList().also {
					it.push(if (whileSource.hasBackReferences) whileSource.clone() else whileSource)
					cachedWhile = it
				}
		if (whileSource.hasBackReferences) list.setSource(0, endRegexSource ?: "\uFFFF")
		return list.compileAG(allowA, allowG)
	}
}

internal class CompiledPatterns(@JvmField val patterns: IntArray, @JvmField val hasMissingPatterns: Boolean)

/** Ports `RuleFactory`, which compiles raw rules into [Rule]s, registering each on its grammar. */
internal object RuleFactory {
	private val parseIntPrefix = Regex("""^\s*([+-]?\d+)""")

	private fun createCaptureRule(grammar: Grammar, name: String?, contentName: String?, retokenizeId: Int): CaptureRule =
		grammar.registerRule { id -> CaptureRule(id, name, contentName, retokenizeId) } as CaptureRule

	fun getCompiledRuleId(desc: RawRule, grammar: Grammar, repository: Map<String, RawRule>): Int {
		if (desc.id == 0) {
			grammar.registerRule { id ->
				desc.id = id
				val match = desc.match
				val begin = desc.begin
				val whilePattern = desc.whilePattern
				when {
					match != null -> MatchRule(id, desc.name, match, compileCaptures(desc.captures, grammar, repository))
					!desc.hasBegin -> {
						val merged = desc.repository?.let { LinkedHashMap(repository).apply { putAll(it) } } ?: repository
						var patterns = desc.patterns
						val include = desc.include
						if (patterns == null && include != null) patterns = listOf(RawRule().also { it.include = include })
						IncludeOnlyRule(id, desc.name, desc.contentName, compilePatterns(patterns, grammar, merged))
					}
					whilePattern != null ->
						BeginWhileRule(
							id,
							desc.name,
							desc.contentName,
							begin,
							compileCaptures(desc.beginCaptures ?: desc.captures, grammar, repository),
							whilePattern,
							compileCaptures(desc.whileCaptures ?: desc.captures, grammar, repository),
							compilePatterns(desc.patterns, grammar, repository)
						)
					else ->
						BeginEndRule(
							id,
							desc.name,
							desc.contentName,
							begin,
							compileCaptures(desc.beginCaptures ?: desc.captures, grammar, repository),
							desc.end,
							compileCaptures(desc.endCaptures ?: desc.captures, grammar, repository),
							desc.applyEndPatternLast,
							compilePatterns(desc.patterns, grammar, repository)
						)
				}
			}
		}
		return desc.id
	}

	private fun compileCaptures(
		captures: Map<String, RawRule>?,
		grammar: Grammar,
		repository: Map<String, RawRule>
	): Array<CaptureRule?> {
		if (captures == null) return emptyArray()
		// parseInt: a leading run of digits, NaN keys are dropped
		val numbered = captures.mapNotNull { (key, rule) ->
			parseIntPrefix.find(key)?.groupValues?.get(1)?.toIntOrNull()?.let { it to rule }
		}
		val maximum = numbered.maxOfOrNull { it.first }?.coerceAtLeast(0) ?: 0
		val result = arrayOfNulls<CaptureRule>(maximum + 1)
		for ((index, capture) in numbered) {
			var retokenizeId = 0
			if (capture.patterns != null) retokenizeId = getCompiledRuleId(capture, grammar, repository)
			val rule = createCaptureRule(grammar, capture.name, capture.contentName, retokenizeId)
			if (index >= 0) result[index] = rule
		}
		return result
	}

	private fun compilePatterns(patterns: List<RawRule>?, grammar: Grammar, repository: Map<String, RawRule>): CompiledPatterns {
		val result = ArrayList<Int>()
		if (patterns != null) {
			for (pattern in patterns) {
				var ruleId = -1
				val include = pattern.include
				if (include != null) {
					when (val reference = parseInclude(include)) {
						IncludeReference.Base, IncludeReference.Self ->
							repository[include]?.let { ruleId = getCompiledRuleId(it, grammar, repository) }
						is IncludeReference.Relative ->
							repository[reference.ruleName]?.let { ruleId = getCompiledRuleId(it, grammar, repository) }
						is IncludeReference.TopLevel -> {
							val external = grammar.getExternalGrammar(reference.scopeName, repository)
							val externalRepository = external?.repository
							val self = externalRepository?.get("\$self")
							if (self != null) ruleId = getCompiledRuleId(self, grammar, externalRepository)
						}
						is IncludeReference.TopLevelRepository -> {
							val external = grammar.getExternalGrammar(reference.scopeName, repository)
							val externalRepository = external?.repository
							val rule = externalRepository?.get(reference.ruleName)
							if (rule != null) ruleId = getCompiledRuleId(rule, grammar, externalRepository)
						}
					}
				} else {
					ruleId = getCompiledRuleId(pattern, grammar, repository)
				}
				if (ruleId != -1) {
					// null while the rule is still compiling (a pattern including its ancestor)
					val rule = grammar.getRuleOrNull(ruleId)
					if (rule is HasPatterns && rule.hasMissingPatterns && rule.patterns.isEmpty()) continue
					result.add(ruleId)
				}
			}
		}
		return CompiledPatterns(result.toIntArray(), (patterns?.size ?: 0) != result.size)
	}
}

/** Ports `RegExpSource`: one pattern, with `\z` rewritten and its `\A`/`\G` variants precomputed. */
internal class RegExpSource(regExpSource: String?, @JvmField val ruleId: Int) {
	var source: String
		private set
	@JvmField val hasAnchor: Boolean
	@JvmField val hasBackReferences: Boolean
	private var anchorCache: Array<String>? = null

	init {
		if (regExpSource != null) {
			val len = regExpSource.length
			var lastPushedPos = 0
			val output = StringBuilder()
			var anchor = false
			var pos = 0
			while (pos < len) {
				if (regExpSource[pos] == '\\' && pos + 1 < len) {
					val next = regExpSource[pos + 1]
					if (next == 'z') {
						output.append(regExpSource, lastPushedPos, pos)
						output.append("$(?!\\n)(?<!\\n)")
						lastPushedPos = pos + 2
					} else if (next == 'A' || next == 'G') {
						anchor = true
					}
					pos++
				}
				pos++
			}
			hasAnchor = anchor
			source =
				if (lastPushedPos == 0) regExpSource
				else output.append(regExpSource, lastPushedPos, len).toString()
		} else {
			hasAnchor = false
			// vscode-textmate would hand the scanner `undefined`; no grammar we ship does
			source = "\uFFFF"
		}
		if (hasAnchor) anchorCache = buildAnchorCache()
		hasBackReferences = HAS_BACK_REFERENCES.containsMatchIn(source)
	}

	fun clone() = RegExpSource(source, ruleId)

	fun setSource(newSource: String) {
		if (source == newSource) return
		source = newSource
		if (hasAnchor) anchorCache = buildAnchorCache()
	}

	fun resolveBackReferences(lineText: String, captureIndices: Array<CaptureIndex>): String {
		val captured = captureIndices.map { lineText.jsSubstring(it.start, it.end) }
		return BACK_REFERENCING_END.replace(source) { match ->
			escapeRegExpCharacters(match.groupValues[1].toIntOrNull()?.let { captured.getOrNull(it) } ?: "")
		}
	}

	/** `\A` and `\G` kept or replaced by `\uFFFF` (which never matches), for each combination. */
	private fun buildAnchorCache(): Array<String> {
		val a0g0 = StringBuilder()
		val a0g1 = StringBuilder()
		val a1g0 = StringBuilder()
		val a1g1 = StringBuilder()
		val len = source.length
		var pos = 0
		while (pos < len) {
			val ch = source[pos]
			a0g0.append(ch)
			a0g1.append(ch)
			a1g0.append(ch)
			a1g1.append(ch)
			if (ch == '\\' && pos + 1 < len) {
				when (val next = source[pos + 1]) {
					'A' -> {
						a0g0.append('\uFFFF')
						a0g1.append('\uFFFF')
						a1g0.append('A')
						a1g1.append('A')
					}
					'G' -> {
						a0g0.append('\uFFFF')
						a0g1.append('G')
						a1g0.append('\uFFFF')
						a1g1.append('G')
					}
					else -> {
						a0g0.append(next)
						a0g1.append(next)
						a1g0.append(next)
						a1g1.append(next)
					}
				}
				pos++
			}
			pos++
		}
		return arrayOf(a0g0.toString(), a0g1.toString(), a1g0.toString(), a1g1.toString())
	}

	fun resolveAnchors(allowA: Boolean, allowG: Boolean): String {
		val cache = anchorCache
		if (!hasAnchor || cache == null) return source
		return cache[(if (allowA) 2 else 0) + (if (allowG) 1 else 0)]
	}

	private companion object {
		val HAS_BACK_REFERENCES = Regex("""\\(\d+)""")
		val BACK_REFERENCING_END = Regex("""\\(\d+)""")
	}
}

/** Ports `RegExpSourceList`: a rule's patterns and its compiled scanners, one per `\A`/`\G` combination. */
internal class RegExpSourceList {
	private val items = ArrayList<RegExpSource>()
	private var hasAnchors = false
	private var cached: CompiledRule? = null
	private val anchorCache = arrayOfNulls<CompiledRule>(4)

	val length get() = items.size

	fun push(item: RegExpSource) {
		items.add(item)
		hasAnchors = hasAnchors || item.hasAnchor
	}

	fun unshift(item: RegExpSource) {
		items.add(0, item)
		hasAnchors = hasAnchors || item.hasAnchor
	}

	fun setSource(index: Int, newSource: String?) {
		val source = newSource ?: "\uFFFF"
		if (items[index].source != source) {
			cached = null
			anchorCache.fill(null)
			items[index].setSource(source)
		}
	}

	fun compile(): CompiledRule =
		cached ?: CompiledRule(items.map { it.source }, IntArray(items.size) { items[it].ruleId }).also { cached = it }

	fun compileAG(allowA: Boolean, allowG: Boolean): CompiledRule {
		if (!hasAnchors) return compile()
		val index = (if (allowA) 2 else 0) + (if (allowG) 1 else 0)
		return anchorCache[index]
			?: CompiledRule(items.map { it.resolveAnchors(allowA, allowG) }, IntArray(items.size) { items[it].ruleId })
				.also { anchorCache[index] = it }
	}
}

/** Ports `CompiledRule`: a scanner and the rule each of its patterns belongs to. */
internal class CompiledRule(patterns: List<String>, private val rules: IntArray) {
	private val scanner = OnigScanner(patterns)

	fun findNextMatch(string: OnigString, startPosition: Int): ScannerMatch? {
		val result = scanner.findNextMatch(string, startPosition) ?: return null
		return ScannerMatch(rules[result.index], result.captureIndices)
	}
}

internal class ScannerMatch(@JvmField val ruleId: Int, @JvmField val captureIndices: Array<CaptureIndex>)
