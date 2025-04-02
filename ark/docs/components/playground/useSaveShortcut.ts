import type * as Monaco from "monaco-editor"
import prettierPluginEstree from "prettier/plugins/estree"
import prettierPluginTypeScript from "prettier/plugins/typescript"
import prettier from "prettier/standalone"
import { useEffect } from "react"
import { findNearestTokenBoundary } from "./utils.ts"

export const useSaveShortcut = (
	editorRef: React.RefObject<Monaco.editor.IStandaloneCodeEditor>,
	validateImmediately: (code: string) => void
) => {
	useEffect(() => {
		if (!editorRef.current) return

		const handleKeyDown = async (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault()
				if (!editorRef.current) return

				try {
					const editor = editorRef.current
					// Store current state
					const selections = editor.getSelections()
					const scrollPosition = {
						scrollLeft: editor.getScrollLeft(),
						scrollTop: editor.getScrollTop()
					}

					const currentCode = editor.getValue()
					const formattedCode = await prettier.format(currentCode, {
						parser: "typescript",
						plugins: [prettierPluginEstree, prettierPluginTypeScript],
						semi: false,
						trailingComma: "none",
						experimentalTernaries: true
					})

					const model = editor.getModel()
					if (!model) return

					const relativePositions = selections?.map(selection => {
						const startOffset = model.getOffsetAt(selection.getStartPosition())
						const endOffset = model.getOffsetAt(selection.getEndPosition())
						return {
							start: startOffset / currentCode.length,
							end: endOffset / currentCode.length,
							direction: selection.getDirection()
						}
					})

					editor.setValue(formattedCode)

					if (selections && relativePositions) {
						const model = editor.getModel()
						if (model) {
							const newSelections = relativePositions.flatMap(pos => {
								if (!pos) return []
								const startOffset = Math.floor(pos.start * formattedCode.length)
								const endOffset = Math.floor(pos.end * formattedCode.length)

								const startPos = findNearestTokenBoundary(
									model,
									model.getPositionAt(startOffset)
								)
								const endPos = findNearestTokenBoundary(
									model,
									model.getPositionAt(endOffset)
								)

								return {
									selectionStartLineNumber: startPos.lineNumber,
									selectionStartColumn: startPos.column,
									positionLineNumber: endPos.lineNumber,
									positionColumn: endPos.column,
									direction: pos.direction
								}
							})

							if (newSelections.length) editor.setSelections(newSelections)
						}
					}

					const lineCountBefore = currentCode.split("\n").length
					const lineCountAfter = formattedCode.split("\n").length
					const scrollRatio = scrollPosition.scrollTop / lineCountBefore
					editor.setScrollPosition({
						scrollLeft: scrollPosition.scrollLeft,
						scrollTop: scrollRatio * lineCountAfter
					})

					validateImmediately(formattedCode)
				} catch {
					// could have invalid syntax etc., fail silently
				}
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [editorRef, validateImmediately])
}
