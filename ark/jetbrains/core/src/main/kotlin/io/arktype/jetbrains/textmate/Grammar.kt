package io.arktype.jetbrains.textmate

import com.google.gson.JsonObject

/**
 * The raw grammars a [Grammar] can see: those its registry loaded, and the
 * injection grammars registered per target scope (`IGrammarRepository`).
 */
internal interface GrammarRepository {
	fun lookup(scopeName: String): JsonObject?

	fun injections(scopeName: String): List<String>?
}

/**
 * A scope list, innermost last (`AttributedScopeStack` without the theme
 * attributes, which never affect scopes). Compared by identity, as
 * vscode-textmate compares them.
 */
internal class ScopeList private constructor(@JvmField val parent: ScopeList?, @JvmField val scopeName: String) {
	private var names: List<String>? = null

	/** Every scope from the root, shared by every token with this scope list. */
	fun scopeNames(): List<String> =
		names
			?: run {
				val result = ArrayList<String>()
				var item: ScopeList? = this
				while (item != null) {
					result.add(item.scopeName)
					item = item.parent
				}
				result.reverse()
				java.util.Collections.unmodifiableList(result).also { names = it }
			}

	/** Ports `pushAttributed`: a name of several space-separated scopes pushes each. */
	fun push(scopePath: String?): ScopeList {
		if (scopePath == null) return this
		if (scopePath.indexOf(' ') == -1) return ScopeList(this, scopePath)
		var result = this
		for (scope in scopePath.split(' ')) result = ScopeList(result, scope)
		return result
	}

	companion object {
		fun root(scopeName: String) = ScopeList(null, scopeName)
	}
}

/** Ports `StateStackImpl`: the rule stack carried from line to line. */
internal class StateStack(
	@JvmField val parent: StateStack?,
	@JvmField val ruleId: Int,
	@JvmField var enterPos: Int,
	@JvmField var anchorPos: Int,
	@JvmField val beginRuleCapturedEOL: Boolean,
	@JvmField val endRule: String?,
	@JvmField val nameScopesList: ScopeList,
	@JvmField val contentNameScopesList: ScopeList
) {
	fun reset() {
		var el: StateStack? = this
		while (el != null) {
			el.enterPos = -1
			el.anchorPos = -1
			el = el.parent
		}
	}

	fun pop(): StateStack? = parent

	fun safePop(): StateStack = parent ?: this

	fun push(
		ruleId: Int,
		enterPos: Int,
		anchorPos: Int,
		beginRuleCapturedEOL: Boolean,
		endRule: String?,
		nameScopesList: ScopeList,
		contentNameScopesList: ScopeList
	) = StateStack(this, ruleId, enterPos, anchorPos, beginRuleCapturedEOL, endRule, nameScopesList, contentNameScopesList)

	fun getRule(grammar: Grammar): Rule = grammar.getRule(ruleId)

	/**
	 * The same frame with another content scope list. vscode-textmate calls
	 * `this.parent.push(...)`, which fails on the root frame; it never
	 * happens there, since the root frame is never a begin rule.
	 */
	fun withContentNameScopesList(contentNameScopeStack: ScopeList): StateStack {
		if (contentNameScopesList === contentNameScopeStack) return this
		return StateStack(parent, ruleId, enterPos, anchorPos, beginRuleCapturedEOL, endRule, nameScopesList, contentNameScopeStack)
	}

	fun withEndRule(endRule: String): StateStack {
		if (this.endRule == endRule) return this
		return StateStack(parent, ruleId, enterPos, anchorPos, beginRuleCapturedEOL, endRule, nameScopesList, contentNameScopesList)
	}

	/** Used to detect endless loops: a frame entered at the same position with the same rule. */
	fun hasSameRuleAs(other: StateStack): Boolean {
		var el: StateStack? = this
		while (el != null && el.enterPos == other.enterPos) {
			if (el.ruleId == other.ruleId) return true
			el = el.parent
		}
		return false
	}
}

/** One token of a line: [start, end) in UTF-16 offsets of the line plus its `\n`. */
internal class RawToken(@JvmField var startIndex: Int, @JvmField val endIndex: Int, @JvmField val scopes: List<String>)

/** Ports `LineTokens` for string scopes (`tokenizeLine`, not the binary `tokenizeLine2`). */
internal class LineTokens {
	@JvmField val tokens = ArrayList<RawToken>()
	private var lastTokenEndIndex = 0

	fun produce(stack: StateStack, endIndex: Int) = produceFromScopes(stack.contentNameScopesList, endIndex)

	fun produceFromScopes(scopesList: ScopeList, endIndex: Int) {
		if (lastTokenEndIndex >= endIndex) return
		tokens.add(RawToken(lastTokenEndIndex, endIndex, scopesList.scopeNames()))
		lastTokenEndIndex = endIndex
	}

	fun getResult(stack: StateStack, lineLength: Int): List<RawToken> {
		if (tokens.isNotEmpty() && tokens.last().startIndex == lineLength - 1) tokens.removeAt(tokens.size - 1)
		if (tokens.isEmpty()) {
			lastTokenEndIndex = -1
			produce(stack, lineLength)
			tokens.last().startIndex = 0
		}
		return tokens
	}
}

internal class Injection(
	@JvmField val matcher: ScopeMatcher,
	@JvmField val ruleId: Int,
	@JvmField val priority: Int
)

internal class LineResult(@JvmField val tokens: List<RawToken>, @JvmField val ruleStack: StateStack)

/**
 * Ports vscode-textmate's `Grammar`: one root grammar, the rules compiled
 * from it and every grammar it includes, and the tokenizer state machine.
 *
 * Rules compile lazily and cache their scanners, and back-referencing end
 * patterns rewrite those caches as they go, so an instance is confined to one
 * thread at a time; [TextMateRegistry] pools them.
 */
internal class Grammar(
	private val rootScopeName: String,
	rawGrammar: JsonObject,
	private val repository: GrammarRepository
) {
	private var rootId = -1
	private val ruleId2desc = ArrayList<Rule?>().apply { add(null) }
	private val includedGrammars = HashMap<String, RawRule>()
	private val grammar = initGrammar(rawGrammar, null)
	private var injections: List<Injection>? = null

	fun registerRule(factory: (Int) -> Rule): Rule {
		val id = ruleId2desc.size
		ruleId2desc.add(null)
		val result = factory(id)
		ruleId2desc[id] = result
		return result
	}

	fun getRule(ruleId: Int): Rule = ruleId2desc[ruleId] ?: error("No rule #$ruleId")

	fun getRuleOrNull(ruleId: Int): Rule? = ruleId2desc[ruleId]

	/** Ports `getExternalGrammar`: an included grammar, initialized once with the includer's `$base`. */
	fun getExternalGrammar(scopeName: String, repository: Map<String, RawRule>?): RawRule? {
		includedGrammars[scopeName]?.let { return it }
		val raw = this.repository.lookup(scopeName) ?: return null
		return initGrammar(raw, repository?.get("\$base")).also { includedGrammars[scopeName] = it }
	}

	/**
	 * Ports `_collectInjections`: the root grammar's own `injections`, then
	 * the injection grammars registered for its scope, stably sorted by
	 * priority (`L:` first).
	 */
	private fun collectInjections(): List<Injection> {
		val result = ArrayList<Injection>()
		fun collect(selector: String, rule: RawRule, ruleRepository: Map<String, RawRule>) {
			val matchers = createMatchers(selector)
			val ruleId = RuleFactory.getCompiledRuleId(rule, this, ruleRepository)
			for (matcher in matchers) result.add(Injection(matcher.matcher, ruleId, matcher.priority))
		}
		grammar.injections?.let { raw ->
			for ((expression, rule) in raw) collect(expression, rule, grammar.repository ?: emptyMap())
		}
		repository.injections(rootScopeName)?.forEach { injectionScopeName ->
			val injectionGrammar = getExternalGrammar(injectionScopeName, null) ?: return@forEach
			val selector = injectionGrammar.injectionSelector ?: return@forEach
			collect(selector, injectionGrammar, injectionGrammar.repository ?: emptyMap())
		}
		return result.sortedBy { it.priority }
	}

	fun getInjections(): List<Injection> = injections ?: collectInjections().also { injections = it }

	private var injectionScopes: ScopeList? = null
	private var injectionMatches = BooleanArray(0)

	/** Which injections' selectors match [scopes], kept for the last scope list asked about. */
	fun injectionMatches(scopes: ScopeList): BooleanArray {
		if (injectionScopes !== scopes) {
			val injections = getInjections()
			val names = scopes.scopeNames()
			injectionMatches = BooleanArray(injections.size) { injections[it].matcher(names) }
			injectionScopes = scopes
		}
		return injectionMatches
	}

	/** Ports `tokenizeLine`: [prevState] null for the first line. */
	fun tokenizeLine(lineText: String, prevState: StateStack?): LineResult {
		if (rootId == -1) {
			val repository = grammar.repository ?: emptyMap()
			rootId = RuleFactory.getCompiledRuleId(repository.getValue("\$self"), this, repository)
			getInjections()
		}
		val isFirstLine: Boolean
		val state: StateStack
		if (prevState == null) {
			isFirstLine = true
			val rootScopeName = getRule(rootId).getName(null, null)
			val scopeList = ScopeList.root(rootScopeName ?: "unknown")
			state = StateStack(null, rootId, -1, -1, false, null, scopeList, scopeList)
		} else {
			isFirstLine = false
			prevState.reset()
			state = prevState
		}
		val onigLineText = OnigString(lineText + "\n")
		val lineLength = onigLineText.content.length
		val lineTokens = LineTokens()
		val stack = Tokenizer(this, onigLineText, isFirstLine, 0, state, lineTokens, true).run()
		return LineResult(lineTokens.getResult(stack, lineLength), stack)
	}
}

/** A capture's scopes, open until [endPos] (`LocalStackElement`). */
private class LocalStackElement(@JvmField val scopes: ScopeList, @JvmField val endPos: Int)

private class MatchResult(
	@JvmField val captureIndices: Array<CaptureIndex>,
	@JvmField val matchedRuleId: Int,
	@JvmField val priorityMatch: Boolean = false
)

/** Ports `_tokenizeString` (without its time limit): tokenizes one line, or one retokenized capture. */
private class Tokenizer(
	private val grammar: Grammar,
	private val lineText: OnigString,
	private var isFirstLine: Boolean,
	private var linePos: Int,
	private var stack: StateStack,
	private val lineTokens: LineTokens,
	checkWhileConditions: Boolean
) {
	private val lineLength = lineText.content.length
	private var stop = false
	private var anchorPosition = -1

	init {
		if (checkWhileConditions) checkWhileConditions()
	}

	fun run(): StateStack {
		while (!stop) scanNext()
		return stack
	}

	private fun scanNext() {
		val r = matchRuleOrInjections()
		if (r == null) {
			lineTokens.produce(stack, lineLength)
			stop = true
			return
		}
		val captureIndices = r.captureIndices
		val matchedRuleId = r.matchedRuleId
		val hasAdvanced = captureIndices.isNotEmpty() && captureIndices[0].end > linePos

		if (matchedRuleId == END_RULE_ID) {
			val poppedRule = stack.getRule(grammar) as BeginEndRule
			lineTokens.produce(stack, captureIndices[0].start)
			stack = stack.withContentNameScopesList(stack.nameScopesList)
			handleCaptures(grammar, lineText, isFirstLine, stack, lineTokens, poppedRule.endCaptures, captureIndices)
			lineTokens.produce(stack, captureIndices[0].end)
			val popped = stack
			stack = popped.parent ?: error("Popped the root rule")
			anchorPosition = popped.anchorPos
			if (!hasAdvanced && popped.enterPos == linePos) {
				// [1] grammar pushed & popped a rule without advancing
				stack = popped
				lineTokens.produce(stack, lineLength)
				stop = true
				return
			}
		} else {
			val rule = grammar.getRule(matchedRuleId)
			lineTokens.produce(stack, captureIndices[0].start)
			val beforePush = stack
			val scopeName = rule.getName(lineText.content, captureIndices)
			val nameScopesList = stack.contentNameScopesList.push(scopeName)
			stack =
				stack.push(
					matchedRuleId,
					linePos,
					anchorPosition,
					captureIndices[0].end == lineLength,
					null,
					nameScopesList,
					nameScopesList
				)
			when (rule) {
				is BeginEndRule -> {
					handleCaptures(grammar, lineText, isFirstLine, stack, lineTokens, rule.beginCaptures, captureIndices)
					lineTokens.produce(stack, captureIndices[0].end)
					anchorPosition = captureIndices[0].end
					val contentName = rule.getContentName(lineText.content, captureIndices)
					stack = stack.withContentNameScopesList(nameScopesList.push(contentName))
					if (rule.endHasBackReferences) {
						stack = stack.withEndRule(rule.getEndWithResolvedBackReferences(lineText.content, captureIndices))
					}
					if (!hasAdvanced && beforePush.hasSameRuleAs(stack)) {
						// [2] grammar pushed the same rule without advancing
						stack = stack.pop() ?: stack
						lineTokens.produce(stack, lineLength)
						stop = true
						return
					}
				}
				is BeginWhileRule -> {
					handleCaptures(grammar, lineText, isFirstLine, stack, lineTokens, rule.beginCaptures, captureIndices)
					lineTokens.produce(stack, captureIndices[0].end)
					anchorPosition = captureIndices[0].end
					val contentName = rule.getContentName(lineText.content, captureIndices)
					stack = stack.withContentNameScopesList(nameScopesList.push(contentName))
					if (rule.whileHasBackReferences) {
						stack = stack.withEndRule(rule.getWhileWithResolvedBackReferences(lineText.content, captureIndices))
					}
					if (!hasAdvanced && beforePush.hasSameRuleAs(stack)) {
						// [3] grammar pushed the same rule without advancing
						stack = stack.pop() ?: stack
						lineTokens.produce(stack, lineLength)
						stop = true
						return
					}
				}
				else -> {
					val captures = (rule as? MatchRule)?.captures ?: emptyArray()
					handleCaptures(grammar, lineText, isFirstLine, stack, lineTokens, captures, captureIndices)
					lineTokens.produce(stack, captureIndices[0].end)
					stack = stack.pop() ?: stack
					if (!hasAdvanced) {
						// [4] grammar is neither advancing nor pushing/popping
						stack = stack.safePop()
						lineTokens.produce(stack, lineLength)
						stop = true
						return
					}
				}
			}
		}
		if (captureIndices[0].end > linePos) {
			linePos = captureIndices[0].end
			isFirstLine = false
		}
	}

	/** Ports `_checkWhileConditions`: every open begin/while rule, outermost first, must match again. */
	private fun checkWhileConditions() {
		anchorPosition = if (stack.beginRuleCapturedEOL) 0 else -1
		val whileRules = ArrayList<StateStack>()
		var node: StateStack? = stack
		while (node != null) {
			if (node.getRule(grammar) is BeginWhileRule) whileRules.add(node)
			node = node.pop()
		}
		for (i in whileRules.indices.reversed()) {
			val whileStack = whileRules[i]
			val rule = whileStack.getRule(grammar) as BeginWhileRule
			val scanner = rule.compileWhileAG(whileStack.endRule, isFirstLine, linePos == anchorPosition)
			val r = scanner.findNextMatch(lineText, linePos)
			if (r == null) {
				stack = whileStack.pop() ?: whileStack
				break
			}
			if (r.ruleId != WHILE_RULE_ID) {
				stack = whileStack.pop() ?: whileStack
				break
			}
			if (r.captureIndices.isNotEmpty()) {
				lineTokens.produce(whileStack, r.captureIndices[0].start)
				handleCaptures(grammar, lineText, isFirstLine, whileStack, lineTokens, rule.whileCaptures, r.captureIndices)
				lineTokens.produce(whileStack, r.captureIndices[0].end)
				anchorPosition = r.captureIndices[0].end
				if (r.captureIndices[0].end > linePos) {
					linePos = r.captureIndices[0].end
					isFirstLine = false
				}
			}
		}
	}

	/** Ports `matchRuleOrInjections`: an injection wins if it starts earlier, or as early with `L:`. */
	private fun matchRuleOrInjections(): MatchResult? {
		val matchResult = matchRule()
		val injections = grammar.getInjections()
		if (injections.isEmpty()) return matchResult
		val injectionResult = matchInjections(injections) ?: return matchResult
		if (matchResult == null) return injectionResult
		val matchScore = matchResult.captureIndices[0].start
		val injectionScore = injectionResult.captureIndices[0].start
		if (injectionScore < matchScore || (injectionResult.priorityMatch && injectionScore == matchScore)) {
			return injectionResult
		}
		return matchResult
	}

	private fun matchRule(): MatchResult? {
		val rule = stack.getRule(grammar)
		val scanner = rule.compileAG(grammar, stack.endRule, isFirstLine, linePos == anchorPosition)
		val r = scanner.findNextMatch(lineText, linePos) ?: return null
		return MatchResult(r.captureIndices, r.ruleId)
	}

	/** Ports `matchInjections`: the earliest match among the injections whose selector matches. */
	private fun matchInjections(injections: List<Injection>): MatchResult? {
		var bestMatchRating = Int.MAX_VALUE
		var bestMatchCaptureIndices: Array<CaptureIndex>? = null
		var bestMatchRuleId = 0
		var bestMatchResultPriority = 0
		val matches = grammar.injectionMatches(stack.contentNameScopesList)
		for ((i, injection) in injections.withIndex()) {
			if (!matches[i]) continue
			val rule = grammar.getRule(injection.ruleId)
			val scanner = rule.compileAG(grammar, null, isFirstLine, linePos == anchorPosition)
			val matchResult = scanner.findNextMatch(lineText, linePos) ?: continue
			val matchRating = matchResult.captureIndices[0].start
			if (matchRating >= bestMatchRating) continue
			bestMatchRating = matchRating
			bestMatchCaptureIndices = matchResult.captureIndices
			bestMatchRuleId = matchResult.ruleId
			bestMatchResultPriority = injection.priority
			if (bestMatchRating == linePos) break
		}
		val captures = bestMatchCaptureIndices ?: return null
		return MatchResult(captures, bestMatchRuleId, bestMatchResultPriority == -1)
	}
}

/**
 * Ports `handleCaptures`: scopes each capture, nesting captures inside the
 * ones that contain them, and retokenizes a capture with `patterns` as its
 * own line, cut off at the capture's end.
 */
private fun handleCaptures(
	grammar: Grammar,
	lineText: OnigString,
	isFirstLine: Boolean,
	stack: StateStack,
	lineTokens: LineTokens,
	captures: Array<CaptureRule?>,
	captureIndices: Array<CaptureIndex>
) {
	if (captures.isEmpty()) return
	val lineTextContent = lineText.content
	val len = minOf(captures.size, captureIndices.size)
	val localStack = ArrayList<LocalStackElement>()
	val maxEnd = captureIndices[0].end
	for (i in 0 until len) {
		val captureRule = captures[i] ?: continue
		val captureIndex = captureIndices[i]
		if (captureIndex.length == 0) continue
		if (captureIndex.start > maxEnd) break
		while (localStack.isNotEmpty() && localStack.last().endPos <= captureIndex.start) {
			lineTokens.produceFromScopes(localStack.last().scopes, localStack.last().endPos)
			localStack.removeAt(localStack.size - 1)
		}
		if (localStack.isNotEmpty()) lineTokens.produceFromScopes(localStack.last().scopes, captureIndex.start)
		else lineTokens.produce(stack, captureIndex.start)

		if (captureRule.retokenizeCapturedWithRuleId != 0) {
			val scopeName = captureRule.getName(lineTextContent, captureIndices)
			val nameScopesList = stack.contentNameScopesList.push(scopeName)
			val contentName = captureRule.getContentName(lineTextContent, captureIndices)
			val contentNameScopesList = nameScopesList.push(contentName)
			val stackClone =
				stack.push(
					captureRule.retokenizeCapturedWithRuleId,
					captureIndex.start,
					-1,
					false,
					null,
					nameScopesList,
					contentNameScopesList
				)
			val onigSubStr = OnigString(lineTextContent.jsSubstring(0, captureIndex.end))
			Tokenizer(
				grammar,
				onigSubStr,
				isFirstLine && captureIndex.start == 0,
				captureIndex.start,
				stackClone,
				lineTokens,
				false
			).run()
			continue
		}

		val captureRuleScopeName = captureRule.getName(lineTextContent, captureIndices)
		if (captureRuleScopeName != null) {
			val base = if (localStack.isNotEmpty()) localStack.last().scopes else stack.contentNameScopesList
			localStack.add(LocalStackElement(base.push(captureRuleScopeName), captureIndex.end))
		}
	}
	while (localStack.isNotEmpty()) {
		lineTokens.produceFromScopes(localStack.last().scopes, localStack.last().endPos)
		localStack.removeAt(localStack.size - 1)
	}
}
