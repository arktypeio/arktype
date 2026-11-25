package io.arktype.jetbrains.highlight

import com.intellij.openapi.editor.colors.TextAttributesKey

/** Demo text for a [com.intellij.openapi.options.colors.ColorSettingsPage], with `<tag>`s around each span. */
data class DemoText(val text: String, val tags: Map<String, TextAttributesKey>) {
	companion object {
		/** Tags every host string character of TypeScript [source] with its ArkType category. */
		fun render(source: String): DemoText {
			// a demo the engine can't highlight still shows the page
			val highlights = runCatching { ArkTypeHighlighting.highlights.compute(source, "ts") }.getOrNull()
				?: return DemoText(source, emptyMap())
			val lineStarts = source.split("\n").runningFold(0) { start, line -> start + line.length + 1 }
			val tags = LinkedHashMap<String, TextAttributesKey>()
			val out = StringBuilder()
			var at = 0
			for (span in highlights.spans.filter { it.region == Region.TEXT }) {
				val start = lineStarts[span.line] + span.column
				val tag = "ark_" + span.category.replace('.', '_')
				tags[tag] = ArkTypeColors.forCategory(span.category)
				out.append(source, at, start).append("<$tag>").append(span.text).append("</$tag>")
				at = start + span.length
			}
			out.append(source, at, source.length)
			return DemoText(out.toString(), tags)
		}
	}
}
