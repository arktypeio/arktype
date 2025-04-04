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
		const scrollPosition = {
			scrollLeft: editor.getScrollLeft(),
			scrollTop: editor.getScrollTop()
		}

		const currentOffset = cursorPosition ? model.getOffsetAt(cursorPosition) : 0
		const lineCountBefore = model.getLineCount()

		const formattedCode = await prettier.format(currentCode, {
			parser: "typescript",
			plugins: [prettierPluginEstree, prettierPluginTypeScript],
			semi: false,
			useTabs: true,
			trailingComma: "none",
			experimentalTernaries: true
		})

		if (formattedCode === currentCode) return

		editor.setValue(formattedCode)

		const newOffset = Math.round(
			currentOffset * (formattedCode.length / currentCode.length)
		)
		const newPosition = model.getPositionAt(newOffset)

		editor.setPosition(newPosition)

		const lineCountAfter = model.getLineCount()
		const scrollRatio = scrollPosition.scrollTop / lineCountBefore
		editor.setScrollPosition({
			scrollLeft: scrollPosition.scrollLeft,
			scrollTop: Math.round(scrollRatio * lineCountAfter)
		})

		return formattedCode
	} catch {
		// could have invalid syntax etc., fail silently
	}
}
