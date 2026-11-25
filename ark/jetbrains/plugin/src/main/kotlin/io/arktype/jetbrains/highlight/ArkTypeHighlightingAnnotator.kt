package io.arktype.jetbrains.highlight

import com.intellij.lang.annotation.AnnotationHolder
import com.intellij.lang.annotation.ExternalAnnotator
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.diagnostic.ControlFlowException
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiFile

/** The text of a file to highlight, as of [stamp]. */
data class HighlightRequest(val text: String, val ext: String, val stamp: Long)

/** The ranges to recolor in a file, as of [stamp]. */
data class HighlightResult(val ranges: List<RecoloredRange>, val stamp: Long)

data class RecoloredRange(val start: Int, val end: Int, val category: String)

/**
 * Colors the strings of ArkType definitions as VS Code does: tokenizes the
 * whole file with VS Code's grammar for it (TypeScript, Vue, Markdown...)
 * and the extension's injection grammar, then recolors each run of host
 * string text whose category the injection changes. Everything else keeps
 * the IDE's own highlighting.
 *
 * Registered for every language, since in a Vue, Svelte, Astro or Markdown
 * file the definitions are in embedded code; the file extension decides.
 */
class ArkTypeHighlightingAnnotator : ExternalAnnotator<HighlightRequest, HighlightResult>(), DumbAware {
	/** whether a failure was logged already, so a broken grammar logs once per session */
	@Volatile
	private var reported = false

	override fun collectInformation(file: PsiFile, editor: Editor, hasErrors: Boolean): HighlightRequest? = collectInformation(file)

	override fun collectInformation(file: PsiFile): HighlightRequest? {
		if (!ArkTypeHighlighting.isHostRoot(file)) return null
		val ext = ArkTypeHighlighting.extensionOf(file.viewProvider.virtualFile) ?: return null
		val document = file.viewProvider.document ?: return null
		val text = document.immutableCharSequence.toString()
		if (!ArkTypeHighlighting.highlights.mayContainArkType(text)) return null
		return HighlightRequest(text, ext, document.modificationStamp)
	}

	override fun doAnnotate(request: HighlightRequest): HighlightResult {
		ProgressManager.checkCanceled()
		val highlights = try {
			ArkTypeHighlighting.highlights.compute(request.text, request.ext)
		} catch (e: Exception) {
			if (e is ControlFlowException) throw e
			// a grammar this engine can't run leaves the IDE's own highlighting
			if (!reported) {
				reported = true
				thisLogger().warn("ArkType highlighting failed for a .${request.ext} file", e)
			}
			return HighlightResult(emptyList(), request.stamp)
		}
		val lineStarts = IntArray(request.text.count { it == '\n' } + 1)
		var line = 0
		for (i in request.text.indices) if (request.text[i] == '\n') lineStarts[++line] = i + 1
		return HighlightResult(
			highlights.recolored.map {
				val start = lineStarts[it.line] + it.column
				RecoloredRange(start, start + it.length, it.category)
			},
			request.stamp
		)
	}

	override fun apply(file: PsiFile, result: HighlightResult, holder: AnnotationHolder) {
		if (file.viewProvider.document?.modificationStamp != result.stamp) return
		for (range in result.ranges) {
			holder.newSilentAnnotation(HighlightSeverity.INFORMATION)
				.range(TextRange(range.start, range.end))
				.textAttributes(ArkTypeColors.forCategory(range.category))
				.create()
		}
	}
}
