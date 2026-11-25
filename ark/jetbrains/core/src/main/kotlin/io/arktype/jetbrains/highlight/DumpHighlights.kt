package io.arktype.jetbrains.highlight

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import io.arktype.jetbrains.textmate.tokenize
import java.io.File

/**
 * Writes the characters the IDE's ArkType layer styles in each file, in the
 * editor conformance schema, for
 * `ark/editor-conformance/highlighting/check.ts --target jetbrains`:
 *
 *   ./gradlew :core:dumpHighlights --args="<outDir> <file>..."
 *
 * That's each run of host string text the injection recolors, as
 * `ArkTypeHighlightingAnnotator` paints it. Code outside strings keeps the
 * IDE's own colors from its TypeScript parser.
 */
fun main(args: Array<String>) {
	require(args.size >= 2) { "Usage: dumpHighlights <outDir> <file>..." }
	val outDir = File(args[0]).apply { mkdirs() }
	val highlights = ArkHighlights(Tokenizer { source, ext, ark -> tokenize(source, ext, ark) })
	for (path in args.drop(1)) {
		val file = File(path)
		val spans = JsonArray()
		for (span in highlights.compute(file.readText(), file.extension).recolored) {
			spans.add(JsonObject().apply {
				addProperty("line", span.line)
				addProperty("column", span.column)
				addProperty("length", span.length)
				addProperty("text", span.text)
				addProperty("category", span.category)
			})
		}
		val fixture = JsonObject().apply {
			addProperty("source", "corpus/${file.name}")
			add("spans", spans)
		}
		outDir.resolve("${file.name}.json").writeText(fixture.toString() + "\n")
	}
}
