package io.arktype.jetbrains.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.BaseState
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.SimplePersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import io.arktype.jetbrains.errors.ErrorLensConfig
import io.arktype.jetbrains.errors.FollowCursor

/**
 * The settings the VS Code extension changes, with its values as defaults.
 * Tools | ArkType edits them.
 */
class ArkTypeSettingsState : BaseState() {
	/** ErrorLens's inline messages, with the extension's `errorLens.replace` rules */
	var inlineErrors by property(true)

	/** `errorLens.followCursor`: the extension sets `closestProblem` */
	var followCursor by string(ErrorLensConfig.extension.followCursor.setting)

	/** `editor.quickSuggestions.strings`, limited to strings in ArkType definitions */
	var completionInStrings by property(true)

	/**
	 * `typescript.preferences.autoImportSpecifierExcludeRegexes`: auto-import
	 * skips modules whose specifier matches one, e.g. `^(node:)?os$`
	 */
	var autoImportSpecifierExcludeRegexes by list<String>()
}

@Service(Service.Level.APP)
@State(name = "ArkTypeSettings", storages = [Storage("arktype.xml")])
class ArkTypeSettings : SimplePersistentStateComponent<ArkTypeSettingsState>(ArkTypeSettingsState()) {
	val followCursor: FollowCursor
		get() = FollowCursor.entries.firstOrNull { it.setting == state.followCursor } ?: ErrorLensConfig.extension.followCursor

	companion object {
		fun get(): ArkTypeSettings = ApplicationManager.getApplication().getService(ArkTypeSettings::class.java)
	}
}
