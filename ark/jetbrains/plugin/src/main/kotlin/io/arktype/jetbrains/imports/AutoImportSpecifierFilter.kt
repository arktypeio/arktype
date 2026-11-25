package io.arktype.jetbrains.imports

import com.intellij.lang.javascript.modules.imports.JSImportCandidate
import com.intellij.lang.javascript.modules.imports.filter.JSImportCandidatesFilter
import io.arktype.jetbrains.errors.JsRegex
import io.arktype.jetbrains.settings.ArkTypeSettings
import java.util.regex.Pattern

/**
 * TypeScript's `autoImportSpecifierExcludeRegexes` for the IDE's own
 * auto-import: a candidate whose module specifier matches one of the regexes
 * in Tools | ArkType isn't offered, so with `^(node:)?os$` completing `type`
 * imports ArkType's rather than `os`'s.
 */
class AutoImportSpecifierFilter(private val excludes: List<Pattern>) : JSImportCandidatesFilter {
	override fun accept(candidate: JSImportCandidate): Boolean {
		val specifier = candidate.descriptor?.moduleName ?: return true
		return excludes.none { it.matcher(specifier).find() }
	}

	class Factory : JSImportCandidatesFilter.FilterFactory {
		override fun createFilter(candidates: List<JSImportCandidate>): JSImportCandidatesFilter {
			val excludes = ArkTypeSettings.get().state.autoImportSpecifierExcludeRegexes.mapNotNull(::compile)
			return AutoImportSpecifierFilter(excludes)
		}
	}

	companion object {
		/**
		 * Compiles a regex as TypeScript does (`/source/flags` or a bare
		 * source), or null if it isn't valid JavaScript to Java.
		 */
		fun compile(regex: String): Pattern? {
			val literal = Regex("^/(.*)/([dgimsuvy]*)$").find(regex)
			return runCatching {
				if (literal == null) JsRegex.compile(regex) else JsRegex.compile(literal.groupValues[1], literal.groupValues[2])
			}.getOrNull()
		}
	}
}
