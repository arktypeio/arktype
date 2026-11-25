package io.arktype.jetbrains.highlight

import com.google.gson.JsonParser
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.PsiFile
import io.arktype.jetbrains.textmate.tokenize

/** The ArkType highlighting engine the IDE shares: VS Code's grammars, run by the TextMate port in core. */
object ArkTypeHighlighting {
	val highlights: ArkHighlights by lazy {
		ArkHighlights(Tokenizer { source, ext, ark -> tokenize(source, ext, ark) })
	}

	/** Every file extension VS Code applies the extension's grammar to (its `injectTo` hosts). */
	val extensions: Set<String> by lazy {
		val index = ArkTypeHighlighting::class.java.getResourceAsStream("/io/arktype/jetbrains/grammars/index.json")
			?.reader()?.use { it.readText() }
			?: error("the grammar index is missing from the plugin's resources")
		JsonParser.parseString(index).asJsonObject.getAsJsonObject("hosts").keySet()
	}

	/** The extension [file] is tokenized as, or null when VS Code wouldn't highlight it. */
	fun extensionOf(file: VirtualFile?): String? = file?.extension?.lowercase()?.takeIf { it in extensions }

	/**
	 * Whether [file] is the one PSI tree of its file to annotate: a Vue or
	 * Markdown file's view provider has a tree per language, but VS Code
	 * tokenizes the file once, as a whole.
	 */
	fun isHostRoot(file: PsiFile): Boolean {
		val viewProvider = file.viewProvider
		return file == viewProvider.getPsi(viewProvider.baseLanguage) && file.context == null
	}
}
