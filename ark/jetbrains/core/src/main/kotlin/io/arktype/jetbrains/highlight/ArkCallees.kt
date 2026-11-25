package io.arktype.jetbrains.highlight

import com.google.gson.JsonParser
import java.util.regex.Pattern

/**
 * The calls whose arguments the extension's injection grammar highlights, read
 * from the `begin` of each rule its top-level patterns include: definitions
 * (`type(`, `scope(`, `x.type(`...), chained methods (`x.or(`...) and
 * `regex(`.
 */
object ArkCallees {
	private val begins: List<Pattern> by lazy {
		val json = ArkCallees::class.java.getResourceAsStream("/io/arktype/jetbrains/grammars/source.arktype.injection.ts.json")
			?.reader()?.use { it.readText() }
			?: error("the ArkType injection grammar is missing from the plugin's resources")
		val grammar = JsonParser.parseString(json).asJsonObject
		val repository = grammar.getAsJsonObject("repository")
		grammar.getAsJsonArray("patterns").map {
			val name = it.asJsonObject["include"].asString.removePrefix("#")
			Pattern.compile(repository.getAsJsonObject(name)["begin"].asString)
		}
	}

	/**
	 * Whether a call of [name], on an object when [qualified] (`x.name(`),
	 * starts an ArkType definition. Each begin ends with the call's `(`, so a
	 * match can only end the call text.
	 */
	fun isArkCallee(name: String, qualified: Boolean): Boolean {
		val callText = (if (qualified) "." else "") + name + "("
		return begins.any { it.matcher(callText).find() }
	}
}
