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
				checkBox("Show problems at the end of the line, shortened to the part of an ArkType error that names the fix")
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
				checkBox("Show completions automatically while typing in an ArkType definition's strings")
					.bindSelected(settings::completionInStrings)
			}
		}
		group("Auto-Import") {
			row {
				label("Skip modules whose specifier matches one of these JavaScript regexes, one per line (e.g. ^(node:)?os$ to import ArkType's type rather than os's):")
			}
			row {
				textArea()
					.rows(3)
					.align(AlignX.FILL)
					.bindText(
						{ settings.autoImportSpecifierExcludeRegexes.joinToString("\n") },
						{ text ->
							settings.autoImportSpecifierExcludeRegexes = text.lines().map(String::trim).filter(String::isNotEmpty).toMutableList()
						}
					)
			}
		}
	}

	override fun apply() {
		super.apply()
		InlineErrors.refreshAllEditors()
	}

	private fun followCursorLabel(followCursor: FollowCursor): String = when (followCursor) {
		FollowCursor.CLOSEST_PROBLEM -> "Only the problem closest to the cursor"
		FollowCursor.ACTIVE_LINE -> "Only problems on the cursor's line"
		FollowCursor.ALL_LINES -> "Every problem"
	}
}
