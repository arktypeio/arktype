package io.arktype.jetbrains.textmate

import com.google.gson.Gson
import java.io.File

/**
 * Writes the tokens of each file as JSON lines, the format
 * `scripts/dumpTokens.ts` writes from the oracle, so `scripts/diffEngine.ts`
 * can compare them. Run through Gradle:
 *
 * `./gradlew :core:dumpTokens --args="--out tokens.ndjson --ark both a.ts b.vue"`
 *
 * `@file` reads further paths from `file`, one per line. `--ark` is `true`
 * (the default), `false` or `both`. Each line is a [DumpedFile].
 */
fun main(args: Array<String>) {
	var out: String? = null
	var variants = listOf(true)
	val paths = ArrayList<String>()
	var i = 0
	while (i < args.size) {
		val arg = args[i++]
		when {
			arg == "--out" -> out = args[i++]
			arg == "--ark" ->
				variants =
					when (args[i++]) {
						"both" -> listOf(true, false)
						"false" -> listOf(false)
						else -> listOf(true)
					}
			arg.startsWith("@") -> paths += File(arg.substring(1)).readLines().filter { it.isNotBlank() }
			else -> paths += arg
		}
	}
	val gson = Gson()
	val registry = TextMateRegistry.default
	val writer = out?.let { File(it).bufferedWriter() } ?: System.out.bufferedWriter()
	writer.use {
		for (path in paths) {
			val ext = path.substringAfterLast('.', "")
			val source = File(path).readText()
			for (ark in variants) {
				val record =
					try {
						dumpFile(path, ark, registry.tokenize(source, ext, ark))
					} catch (e: Exception) {
						DumpedFile(path, ark, error = e.toString())
					}
				it.write(gson.toJson(record))
				it.write("\n")
			}
		}
	}
}

/**
 * One file's tokens: each distinct scope list once in [scopes], and each
 * line's tokens as `[start, end, index into scopes]`.
 */
class DumpedFile(
	val path: String,
	val ark: Boolean,
	val scopes: List<List<String>>? = null,
	val lines: List<List<IntArray>>? = null,
	val error: String? = null
)

private fun dumpFile(path: String, ark: Boolean, tokens: List<List<ScopedToken>>): DumpedFile {
	val scopeIndex = LinkedHashMap<List<String>, Int>()
	val lines = tokens.map { line ->
		line.map { intArrayOf(it.start, it.end, scopeIndex.getOrPut(it.scopes) { scopeIndex.size }) }
	}
	return DumpedFile(path, ark, scopeIndex.keys.toList(), lines)
}
