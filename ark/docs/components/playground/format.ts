import type * as Monaco from "monaco-editor"
import prettierPluginEstree from "prettier/plugins/estree"
import prettierPluginTypeScript from "prettier/plugins/typescript"
import prettier from "prettier/standalone"

export const formatEditor = async (
	editor: Monaco.editor.IStandaloneCodeEditor
): Promise<string | undefined> => {
	const model = editor.getModel()
	if (!model) return

	try {
		const currentCode = editor.getValue()
		const cursorPosition = editor.getPosition()
		const cursorOffset = model.getOffsetAt(cursorPosition!)!

		const result = await prettier.formatWithCursor(currentCode, {
			parser: "typescript",
			cursorOffset,
			plugins: [prettierPluginEstree, prettierPluginTypeScript],
			semi: false,
			useTabs: true,
			trailingComma: "none",
			experimentalTernaries: true
		})
		model.setValue(result.formatted)
		editor.setPosition(model.getPositionAt(result.cursorOffset))
	} catch {
		// could have invalid syntax etc., fail silently
	}
}
