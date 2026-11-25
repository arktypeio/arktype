package io.arktype.jetbrains.textmate

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive

/**
 * A rule as a grammar's JSON declares it (`IRawRule` in vscode-textmate),
 * also standing in for a whole grammar (`IRawGrammar`), which vscode-textmate
 * treats as a rule when it compiles an injection grammar or `$self`.
 *
 * Each [toRawRule] call makes fresh objects, like vscode-textmate's `clone`
 * in `initGrammar`: [id] is the `desc.id` the rule factory stores on the
 * object, so the same JSON loaded by two grammar instances compiles twice.
 *
 * Fields keep JavaScript truthiness where vscode-textmate tests it: a string
 * field is null when absent or empty, except [begin], whose presence
 * (`typeof desc.begin === "undefined"`) is tracked by [hasBegin].
 */
internal class RawRule {
	@JvmField var id = 0
	@JvmField var include: String? = null
	@JvmField var name: String? = null
	@JvmField var contentName: String? = null
	@JvmField var match: String? = null
	@JvmField var captures: Map<String, RawRule>? = null
	@JvmField var hasBegin = false
	@JvmField var begin: String? = null
	@JvmField var beginCaptures: Map<String, RawRule>? = null
	@JvmField var end: String? = null
	@JvmField var endCaptures: Map<String, RawRule>? = null
	@JvmField var whilePattern: String? = null
	@JvmField var whileCaptures: Map<String, RawRule>? = null
	@JvmField var patterns: List<RawRule>? = null
	@JvmField var repository: MutableMap<String, RawRule>? = null
	@JvmField var applyEndPatternLast = false

	// grammar-only fields
	@JvmField var scopeName: String? = null
	@JvmField var injectionSelector: String? = null
	@JvmField var injections: Map<String, RawRule>? = null
}

/** JavaScript truthiness of a JSON value. */
private fun JsonElement?.truthy(): Boolean =
	when {
		this == null || isJsonNull -> false
		this is JsonPrimitive ->
			when {
				isBoolean -> asBoolean
				isNumber -> asDouble.let { it != 0.0 && !it.isNaN() }
				else -> asString.isNotEmpty()
			}
		else -> true
	}

/** A string field, or null where vscode-textmate's `x || null` would be null. */
private fun JsonObject.string(key: String): String? {
	val value = get(key)
	if (!value.truthy()) return null
	return if (value is JsonPrimitive) value.asString else value.toString()
}

private fun JsonElement.ruleMap(): Map<String, RawRule>? =
	when (this) {
		is JsonObject -> {
			val result = LinkedHashMap<String, RawRule>()
			// `for...in` visits integer keys first, ascending
			val (numeric, other) = keySet().partition { key -> key.isNotEmpty() && key.all { it.isDigit() } }
			for (key in numeric.sortedBy { it.toBigInteger() } + other) {
				val value = get(key)
				if (value is JsonObject) result[key] = value.toRawRule()
			}
			result
		}
		is JsonArray -> {
			val result = LinkedHashMap<String, RawRule>()
			forEachIndexed { i, value -> if (value is JsonObject) result[i.toString()] = value.toRawRule() }
			result
		}
		else -> null
	}

/** A deep copy of a rule or grammar, like vscode-textmate's `clone`. */
internal fun JsonObject.toRawRule(): RawRule {
	val rule = RawRule()
	rule.include = string("include")
	rule.name = string("name")
	rule.contentName = string("contentName")
	rule.match = string("match")
	rule.captures = get("captures")?.ruleMap()
	val begin = get("begin")
	rule.hasBegin = begin != null
	rule.begin = if (begin is JsonPrimitive) begin.asString else null
	rule.beginCaptures = get("beginCaptures")?.ruleMap()
	rule.end = string("end")
	rule.endCaptures = get("endCaptures")?.ruleMap()
	rule.whilePattern = string("while")
	rule.whileCaptures = get("whileCaptures")?.ruleMap()
	rule.patterns = (get("patterns") as? JsonArray)?.mapNotNull { (it as? JsonObject)?.toRawRule() }
	rule.repository = (get("repository") as? JsonObject)?.let { repository ->
		LinkedHashMap<String, RawRule>().also { map ->
			for ((key, value) in repository.entrySet()) if (value is JsonObject) map[key] = value.toRawRule()
		}
	}
	rule.applyEndPatternLast = get("applyEndPatternLast").truthy()
	rule.scopeName = string("scopeName")
	rule.injectionSelector = string("injectionSelector")
	rule.injections = (get("injections") as? JsonObject)?.ruleMap()
	return rule
}

/**
 * Ports vscode-textmate's `initGrammar`: a fresh copy of the grammar whose
 * repository gains `$self` (the grammar's top-level patterns) and `$base`
 * (the including grammar's `$base`, or `$self` for the root).
 */
internal fun initGrammar(grammar: JsonObject, base: RawRule?): RawRule {
	val result = grammar.toRawRule()
	val repository = result.repository ?: LinkedHashMap<String, RawRule>().also { result.repository = it }
	val self = RawRule()
	self.patterns = result.patterns
	self.name = result.scopeName
	repository["\$self"] = self
	repository["\$base"] = base ?: self
	return result
}

/** An `include` value, ported from vscode-textmate's `parseInclude`. */
internal sealed interface IncludeReference {
	data object Base : IncludeReference

	data object Self : IncludeReference

	data class Relative(val ruleName: String) : IncludeReference

	data class TopLevel(val scopeName: String) : IncludeReference

	data class TopLevelRepository(val scopeName: String, val ruleName: String) : IncludeReference
}

internal fun parseInclude(include: String): IncludeReference {
	if (include == "\$base") return IncludeReference.Base
	if (include == "\$self") return IncludeReference.Self
	val sharp = include.indexOf('#')
	return when {
		sharp == -1 -> IncludeReference.TopLevel(include)
		sharp == 0 -> IncludeReference.Relative(include.substring(1))
		else -> IncludeReference.TopLevelRepository(include.substring(0, sharp), include.substring(sharp + 1))
	}
}
