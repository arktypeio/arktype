package io.arktype.jetbrains.textmate

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.util.Collections
import java.util.IdentityHashMap
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * One token: [start, end) in UTF-16 columns (Kotlin string indices) of
 * line [line], and its scopes from the root grammar's scope inward.
 */
data class ScopedToken(val line: Int, val start: Int, val end: Int, val scopes: List<String>)

/** The grammars a file extension is tokenized with (`index.json`'s `hosts`). */
private class HostSpec(val scopeName: String, val injections: Map<String, List<String>>)

/** The injection grammar the VS Code extension contributes. */
const val ARK_INJECTION_SCOPE = "source.arktype.injection.ts"

/**
 * Tokenizes files the way VS Code does with the ArkType extension installed,
 * by running VS Code's own TextMate grammars (written to the classpath by
 * `scripts/writeGrammars.ts`) through a port of `vscode-textmate`.
 *
 * Grammars are read and parsed on first use. Thread-safe: each host keeps a
 * pool of grammar instances, so concurrent calls never share mutable state,
 * while compiled regexes are shared by all of them.
 */
class TextMateRegistry(private val readResource: (path: String) -> String?) {
	private val index: JsonObject by lazy {
		JsonParser.parseString(readResource("index.json") ?: error("No TextMate grammar index")).asJsonObject
	}
	private val grammarFiles: Map<String, String> by lazy {
		index.getAsJsonObject("grammars").entrySet().associate { (scope, file) -> scope to file.asString }
	}
	private val hostSpecs: Map<String, HostSpec> by lazy {
		index.getAsJsonObject("hosts").entrySet().associate { (ext, host) ->
			val obj = host.asJsonObject
			val injections =
				obj.getAsJsonObject("injections").entrySet().associate { (target, scopes) ->
					target to (scopes as JsonArray).map(JsonElement::getAsString)
				}
			ext to HostSpec(obj.get("scopeName").asString, injections)
		}
	}
	private val rawGrammars = ConcurrentHashMap<String, JsonObject>()
	private val missing: JsonObject = JsonObject()
	private val hosts = ConcurrentHashMap<String, Host>()

	/** Every file extension this registry can tokenize. */
	val extensions: Set<String> get() = hostSpecs.keys

	fun supports(ext: String): Boolean = ext in hostSpecs

	/**
	 * Tokenizes [source] as a file with extension [ext], line by line (split
	 * on `\n`), like the editor conformance oracle's `createTokenizer`: one
	 * list of tokens per line, their ends clamped to the line's length.
	 * [ark] false tokenizes without the ArkType injection, as VS Code does
	 * without the extension.
	 */
	fun tokenize(source: String, ext: String, ark: Boolean = true): List<List<ScopedToken>> {
		val host = host(ext, ark)
		val grammar = host.pool.poll() ?: host.newGrammar()
		try {
			var state: StateStack? = null
			return source.split('\n').mapIndexed { line, text ->
				val result = grammar.tokenizeLine(text, state)
				state = result.ruleStack
				result.tokens.map { ScopedToken(line, it.startIndex, minOf(it.endIndex, text.length), it.scopes) }
			}
		} finally {
			host.pool.offer(grammar)
		}
	}

	private fun host(ext: String, ark: Boolean): Host =
		hosts.computeIfAbsent("$ext:$ark") {
			val spec = hostSpecs[ext] ?: throw IllegalArgumentException("No TextMate host for .$ext")
			val injections =
				if (ark) spec.injections
				else spec.injections.mapValues { (_, scopes) -> scopes.filter { it != ARK_INJECTION_SCOPE } }
			Host(spec.scopeName, loadDependencies(spec.scopeName, injections))
		}

	private fun rawGrammar(scopeName: String): JsonObject? {
		val grammar =
			rawGrammars.computeIfAbsent(scopeName) {
				val file = grammarFiles[scopeName]
				val text = file?.let(readResource)
				if (text == null) missing else JsonParser.parseString(text).asJsonObject
			}
		return if (grammar === missing) null else grammar
	}

	/**
	 * Ports `Registry._loadGrammar` and `ScopeDependencyProcessor`: loads the
	 * root grammar and every grammar it can reach through `include`s or
	 * injections, the only ones its rules may include. Like VS Code's
	 * `TMGrammarFactory`, a grammar injected into `a.b` is also injected into
	 * `a.b.c`.
	 */
	private fun loadDependencies(rootScopeName: String, injectionsByTarget: Map<String, List<String>>): SyncRepository {
		val injectionsFor = { scopeName: String ->
			val parts = scopeName.split('.')
			parts.indices.flatMap { i -> injectionsByTarget[parts.subList(0, i + 1).joinToString(".")] ?: emptyList() }
		}
		val repo = SyncRepository()
		val loaded = HashSet<String>()
		fun loadSingle(scopeName: String) {
			if (!loaded.add(scopeName)) return
			val grammar = rawGrammar(scopeName) ?: return
			repo.grammars[scopeName] = grammar
			repo.injections[scopeName] = injectionsFor(scopeName)
		}
		val seenFull = HashSet<String>().apply { add(rootScopeName) }
		val seenPartial = HashSet<String>()
		var queue: List<ExternalReference> = listOf(ExternalReference(rootScopeName, null))
		while (queue.isNotEmpty()) {
			for (request in queue) loadSingle(request.scopeName)
			val deps = ExternalReferenceCollector()
			for (dep in queue) collectReferencesOfReference(dep, rootScopeName, repo, deps)
			val next = ArrayList<ExternalReference>()
			for (dep in deps.references) {
				if (dep.ruleName == null) {
					if (!seenFull.add(dep.scopeName)) continue
					next.add(dep)
				} else {
					if (dep.scopeName in seenFull) continue
					if (!seenPartial.add(dep.key)) continue
					next.add(dep)
				}
			}
			queue = next
		}
		return repo
	}

	private class SyncRepository : GrammarRepository {
		val grammars = HashMap<String, JsonObject>()
		val injections = HashMap<String, List<String>>()

		override fun lookup(scopeName: String) = grammars[scopeName]

		override fun injections(scopeName: String) = injections[scopeName]
	}

	private inner class Host(val scopeName: String, val repository: SyncRepository) {
		val pool = ConcurrentLinkedQueue<Grammar>()

		fun newGrammar(): Grammar {
			val raw = repository.lookup(scopeName) ?: error("No grammar for $scopeName")
			return Grammar(scopeName, raw, repository)
		}
	}

	companion object {
		/** Grammars from `io/arktype/jetbrains/grammars/` on [classLoader]'s classpath. */
		fun fromClasspath(classLoader: ClassLoader = TextMateRegistry::class.java.classLoader): TextMateRegistry =
			TextMateRegistry { path ->
				classLoader.getResourceAsStream("io/arktype/jetbrains/grammars/$path")?.use {
					it.readBytes().toString(Charsets.UTF_8)
				}
			}

		/** The registry reading this library's own classpath. */
		val default: TextMateRegistry by lazy { fromClasspath() }
	}
}

/** [TextMateRegistry.tokenize] with the grammars on this library's classpath. */
fun tokenize(source: String, ext: String, ark: Boolean = true): List<List<ScopedToken>> =
	TextMateRegistry.default.tokenize(source, ext, ark)

// Ports grammarDependencies.ts: which grammars a grammar's rules reference.

/** A whole grammar ([ruleName] null) or one of its repository rules. */
private class ExternalReference(val scopeName: String, val ruleName: String?) {
	val key = if (ruleName == null) scopeName else "$scopeName#$ruleName"
}

private class ExternalReferenceCollector {
	val references = ArrayList<ExternalReference>()
	private val seenKeys = HashSet<String>()
	val visitedRule: MutableSet<JsonObject> = Collections.newSetFromMap(IdentityHashMap())

	fun add(reference: ExternalReference) {
		if (seenKeys.add(reference.key)) references.add(reference)
	}
}

private class DependencyContext(val baseGrammar: JsonObject, val selfGrammar: JsonObject, val repository: Map<String, JsonElement>?)

private fun JsonObject.repositoryMap(): Map<String, JsonElement>? =
	(get("repository") as? JsonObject)?.entrySet()?.associateTo(LinkedHashMap()) { it.key to it.value }

private fun collectReferencesOfReference(
	reference: ExternalReference,
	baseGrammarScopeName: String,
	repo: GrammarRepository,
	result: ExternalReferenceCollector
) {
	val selfGrammar =
		repo.lookup(reference.scopeName)
			?: run {
				if (reference.scopeName == baseGrammarScopeName) error("No grammar provided for <$baseGrammarScopeName>")
				return
			}
	val baseGrammar = repo.lookup(baseGrammarScopeName) ?: return
	val ruleName = reference.ruleName
	if (ruleName == null) {
		collectExternalReferencesInTopLevelRule(DependencyContext(baseGrammar, selfGrammar, null), result)
	} else {
		collectExternalReferencesInTopLevelRepositoryRule(
			ruleName,
			DependencyContext(baseGrammar, selfGrammar, selfGrammar.repositoryMap()),
			result
		)
	}
	repo.injections(reference.scopeName)?.forEach { result.add(ExternalReference(it, null)) }
}

private fun collectExternalReferencesInTopLevelRepositoryRule(
	ruleName: String,
	context: DependencyContext,
	result: ExternalReferenceCollector
) {
	val rule = context.repository?.get(ruleName) as? JsonObject ?: return
	collectExternalReferencesInRules(listOf(rule), context, result)
}

private fun collectExternalReferencesInTopLevelRule(context: DependencyContext, result: ExternalReferenceCollector) {
	val self = context.selfGrammar
	val repository = self.repositoryMap()
	(self.get("patterns") as? JsonArray)?.let { patterns ->
		collectExternalReferencesInRules(
			patterns.filterIsInstance<JsonObject>(),
			DependencyContext(context.baseGrammar, self, repository),
			result
		)
	}
	(self.get("injections") as? JsonObject)?.let { injections ->
		collectExternalReferencesInRules(
			injections.entrySet().mapNotNull { it.value as? JsonObject },
			DependencyContext(context.baseGrammar, self, repository),
			result
		)
	}
}

private fun collectExternalReferencesInRules(
	rules: List<JsonObject>,
	context: DependencyContext,
	result: ExternalReferenceCollector
) {
	for (rule in rules) {
		if (!result.visitedRule.add(rule)) continue
		val ruleRepository = rule.repositoryMap()
		val patternRepository =
			if (ruleRepository != null) LinkedHashMap(context.repository ?: emptyMap()).apply { putAll(ruleRepository) }
			else context.repository
		(rule.get("patterns") as? JsonArray)?.let { patterns ->
			collectExternalReferencesInRules(
				patterns.filterIsInstance<JsonObject>(),
				DependencyContext(context.baseGrammar, context.selfGrammar, patternRepository),
				result
			)
		}
		val include = (rule.get("include") as? com.google.gson.JsonPrimitive)?.asString
		if (include.isNullOrEmpty()) continue
		when (val reference = parseInclude(include)) {
			IncludeReference.Base ->
				collectExternalReferencesInTopLevelRule(
					DependencyContext(context.baseGrammar, context.baseGrammar, context.repository),
					result
				)
			IncludeReference.Self -> collectExternalReferencesInTopLevelRule(context, result)
			is IncludeReference.Relative ->
				collectExternalReferencesInTopLevelRepositoryRule(
					reference.ruleName,
					DependencyContext(context.baseGrammar, context.selfGrammar, patternRepository),
					result
				)
			is IncludeReference.TopLevel, is IncludeReference.TopLevelRepository -> {
				val scopeName =
					if (reference is IncludeReference.TopLevel) reference.scopeName
					else (reference as IncludeReference.TopLevelRepository).scopeName
				val ruleName = (reference as? IncludeReference.TopLevelRepository)?.ruleName
				val selfGrammar =
					when (scopeName) {
						context.selfGrammar.scopeNameOrNull() -> context.selfGrammar
						context.baseGrammar.scopeNameOrNull() -> context.baseGrammar
						else -> null
					}
				if (selfGrammar != null) {
					val newContext = DependencyContext(context.baseGrammar, selfGrammar, patternRepository)
					if (ruleName != null) collectExternalReferencesInTopLevelRepositoryRule(ruleName, newContext, result)
					else collectExternalReferencesInTopLevelRule(newContext, result)
				} else {
					result.add(ExternalReference(scopeName, ruleName))
				}
			}
		}
	}
}

private fun JsonObject.scopeNameOrNull(): String? = (get("scopeName") as? com.google.gson.JsonPrimitive)?.asString
