package io.arktype.jetbrains.settings

import com.intellij.openapi.options.BoundConfigurable
import com.intellij.openapi.ui.DialogPanel
import com.intellij.ui.dsl.builder.AlignX
import com.intellij.ui.dsl.builder.bindItem
import com.intellij.ui.dsl.builder.bindSelected
import com.intellij.ui.dsl.builder.bindText
import com.intellij.ui.dsl.builder.panel
import com.intellij.ui.dsl.builder.rows
import io.arktype.jetbrains.errors.FollowCursor
import io.arktype.jetbrains.errors.InlineErrors

/** Tools | ArkType */
class ArkTypeConfigurable : BoundConfigurable("ArkType") {
	private val settings = ArkTypeSettings.get().state

	override fun createPanel(): DialogPanel = panel {
		group("Inline Errors") {
			row {
				checkBox("Show problems at the end of the line")
					.comment("ArkType errors are shortened to the part that names the fix, as in VS Code with ErrorLens")
					.bindSelected(settings::inlineErrors)
			}
			row("Show:") {
				comboBox(FollowCursor.entries.map(::followCursorLabel))
					.bindItem(
						{ FollowCursor.entries.firstOrNull { it.setting == settings.followCursor }?.let(::followCursorLabel) },
						{ label -> settings.followCursor = (FollowCursor.entries.firstOrNull { followCursorLabel(it) == label } ?: FollowCursor.CLOSEST_PROBLEM).setting }
					)
			}
		}
		group("Completion") {
			row {
				checkBox("Show completions while typing in a definition's strings")
					.bindSelected(settings::completionInStrings)
			}
		}
		group("Auto-Import") {
			row("Skip modules matching:") {
				textArea()
					.rows(3)
					.align(AlignX.FILL)
					.bindText(
						{ settings.autoImportSpecifierExcludeRegexes.joinToString("\n") },
						{ text ->
							settings.autoImportSpecifierExcludeRegexes = text.lines().map(String::trim).filter(String::isNotEmpty).toMutableList()
						}
					)
					.comment("JavaScript regexes, one per line, as in TypeScript's autoImportSpecifierExcludeRegexes. Add ^(node:)?os$ so <code>type</code> imports from ArkType rather than os.")
			}
		}
	}

	override fun apply() {
		super.apply()
		InlineErrors.refreshAllEditors()
	}

	private fun followCursorLabel(followCursor: FollowCursor): String = when (followCursor) {
		FollowCursor.CLOSEST_PROBLEM -> "Closest to the cursor"
		FollowCursor.ACTIVE_LINE -> "On the cursor's line"
		FollowCursor.ALL_LINES -> "All"
	}
}
