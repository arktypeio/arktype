package io.arktype.jetbrains.errors

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.codeInsight.daemon.impl.HighlightInfo
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.Inlay
import com.intellij.openapi.editor.InlayProperties
import com.intellij.openapi.editor.event.CaretEvent
import com.intellij.openapi.editor.event.CaretListener
import com.intellij.openapi.editor.markup.HighlighterLayer
import com.intellij.openapi.editor.markup.RangeHighlighter
import com.intellij.openapi.editor.markup.TextAttributes
import com.intellij.openapi.editor.impl.DocumentMarkupModel
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.startup.ProjectActivity
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.Key
import io.arktype.jetbrains.highlight.ArkTypeHighlighting
import io.arktype.jetbrains.settings.ArkTypeSettings

/** A problem as ErrorLens sees it: the line it starts on, its severity and its message. */
data class Problem(val line: Int, val severity: Severity, val message: String)

/** ErrorLens's diagnostic levels, most severe first; the extension enables all three (not hints). */
enum class Severity {
	ERROR,
	WARNING,
	INFO;

	companion object {
		/** IDE severities as ErrorLens levels: weak warnings are VS Code's infos, anything milder is a hint. */
		fun of(severity: HighlightSeverity): Severity? = when {
			severity >= HighlightSeverity.ERROR -> ERROR
			severity >= HighlightSeverity.WARNING -> WARNING
			severity >= HighlightSeverity.WEAK_WARNING -> INFO
			else -> null
		}
	}
}

/** A message to draw at the end of [line]. */
data class InlineMessage(val line: Int, val severity: Severity, val text: String)

/**
 * The inline messages ErrorLens would show for [problems] with the cursor on
 * [cursorLine], ported from `doUpdateDecorations` in
 * usernamehw/vscode-error-lens `src/decorations.ts`: problems are grouped by
 * the line they start on, each shown line shows its most severe problem, and
 * `closestProblem` shows only the `followCursorMore + 1` lines nearest the
 * cursor (the line above winning a tie).
 */
fun inlineMessages(problems: List<Problem>, cursorLine: Int, lens: ErrorLens): List<InlineMessage> {
	val byLine = problems.groupBy { it.line }.toSortedMap()
	val lines = when (lens.config.followCursor) {
		FollowCursor.ALL_LINES -> byLine.keys.toList()
		FollowCursor.ACTIVE_LINE -> byLine.keys.filter { it in (cursorLine - lens.config.followCursorMore)..(cursorLine + lens.config.followCursorMore) }
		FollowCursor.CLOSEST_PROBLEM -> byLine.keys.sortedBy { Math.abs(cursorLine - it) }.take(lens.config.followCursorMore + 1)
	}
	return lines.sorted().map { line ->
		val problem = byLine.getValue(line).minBy { it.severity.ordinal }
		InlineMessage(line, problem.severity, lens.inlineMessage(problem.message))
	}
}

/** The TypeScript service's message for a problem, without the `TS2322: ` code the IDE prefixes it with. */
fun diagnosticMessage(description: String): String = TS_CODE_PREFIX.replaceFirst(description, "")

private val TS_CODE_PREFIX = Regex("^TS\\d+: ")

/**
 * ErrorLens for the IDE: after each highlighting pass and each move of the
 * cursor to another line, redraws the inline messages of the editors of
 * files the extension highlights.
 */
@Service(Service.Level.PROJECT)
class InlineErrors(private val project: Project) : Disposable {
	fun start() {
		project.messageBus.connect(this).subscribe(DaemonCodeAnalyzer.DAEMON_EVENT_TOPIC, object : DaemonCodeAnalyzer.DaemonListener {
			override fun daemonFinished(fileEditors: Collection<FileEditor>) {
				for (fileEditor in fileEditors) if (fileEditor is TextEditor) update(fileEditor.editor)
			}
		})
		EditorFactory.getInstance().eventMulticaster.addCaretListener(object : CaretListener {
			override fun caretPositionChanged(event: CaretEvent) {
				if (event.editor.project == project && event.oldPosition.line != event.newPosition.line) update(event.editor)
			}
		}, this)
	}

	fun update(editor: Editor) {
		if (editor.isDisposed) return
		val settings = ArkTypeSettings.get()
		val file = FileDocumentManager.getInstance().getFile(editor.document)
		val messages =
			if (!settings.state.inlineErrors || ArkTypeHighlighting.extensionOf(file) == null) emptyList()
			else {
				val lens = ErrorLens(ErrorLensConfig.extension.copy(followCursor = settings.followCursor))
				val cursorLine = editor.document.getLineNumber(editor.selectionModel.selectionStart)
				inlineMessages(problems(editor), cursorLine, lens)
			}
		render(editor, messages)
	}

	private fun problems(editor: Editor): List<Problem> {
		val document = editor.document
		val problems = ArrayList<Pair<Int, Problem>>()
		for (highlighter in DocumentMarkupModel.forDocument(document, project, true).allHighlighters) {
			if (!highlighter.isValid) continue
			val info = HighlightInfo.fromRangeHighlighter(highlighter) ?: continue
			val severity = Severity.of(info.severity) ?: continue
			val description = info.description?.takeIf { it.isNotBlank() } ?: continue
			if (info.startOffset > document.textLength) continue
			problems += info.startOffset to Problem(document.getLineNumber(info.startOffset), severity, diagnosticMessage(description))
		}
		// the IDE's highlighters aren't ordered; ErrorLens keeps the provider's order, which is by position
		return problems.sortedBy { it.first }.map { it.second }
	}

	private fun render(editor: Editor, messages: List<InlineMessage>) {
		val drawn = editor.getUserData(DRAWN)
		if (drawn != null && drawn.messages == messages && drawn.isValid()) return
		drawn?.remove()
		val document = editor.document
		val shown = messages.filter { it.line < document.lineCount }
		editor.putUserData(
			DRAWN,
			Drawn(
				shown,
				inlays = shown.map {
					editor.inlayModel.addAfterLineEndElement(
						document.getLineEndOffset(it.line),
						InlayProperties().relatesToPrecedingText(true).disableSoftWrapping(true),
						InlineErrorRenderer(it)
					)
				}.filterNotNull(),
				// errorLens.messageBackgroundMode "line": the shown line is tinted
				// across the editor
				lines = shown.map {
					editor.markupModel.addLineHighlighter(it.line, HighlighterLayer.CARET_ROW + 1, TextAttributes().apply { backgroundColor = InlineErrorRenderer.lineBackground(it.severity) })
				}
			)
		)
	}

	/** what's drawn in an editor for its [messages] */
	private class Drawn(val messages: List<InlineMessage>, val inlays: List<Inlay<*>>, val lines: List<RangeHighlighter>) {
		fun isValid(): Boolean = inlays.all { it.isValid } && lines.all { it.isValid }

		fun remove() {
			inlays.forEach(Disposer::dispose)
			lines.forEach(RangeHighlighter::dispose)
		}
	}

	override fun dispose() {
		for (editor in EditorFactory.getInstance().allEditors) {
			if (editor.project != project) continue
			editor.getUserData(DRAWN)?.remove()
			editor.putUserData(DRAWN, null)
		}
	}

	companion object {
		private val DRAWN = Key.create<Drawn>("arktype.inlineErrors")

		/** redraws every open editor, after the settings change */
		fun refreshAllEditors() {
			ApplicationManager.getApplication().invokeLater {
				for (project in ProjectManager.getInstance().openProjects) {
					if (project.isDisposed) continue
					val inlineErrors = project.service<InlineErrors>()
					for (editor in EditorFactory.getInstance().allEditors) if (editor.project == project) inlineErrors.update(editor)
				}
			}
		}
	}
}

class InlineErrorsStartup : ProjectActivity {
	override suspend fun execute(project: Project) {
		ApplicationManager.getApplication().invokeLater({ project.service<InlineErrors>().start() }, project.disposed)
	}
}
