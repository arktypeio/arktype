import type * as Monaco from "monaco-editor"
import { createPositionHash, isDuplicateRequest } from "./utils.ts"

type DisplayPart = {
	text: string
}

const formatHoverInfo = (
	hoverInfo: any,
	model: Monaco.editor.ITextModel
): Monaco.languages.ProviderResult<Monaco.languages.Hover> => {
	if (!hoverInfo.displayParts) return

	const displayText = hoverInfo.displayParts
		.map((part: DisplayPart) => part.text)
		.join("")
		// when bundling .d.ts, tsup creates synthetic aliases like Type$6
		// for name collisions. remove them to reflect the actual editor experience
		.replace(/Type\$\d+/g, "Type")

	const contents = [{ value: "```typescript\n" + displayText + "\n```" }]

	if (hoverInfo.documentation) {
		const docs = hoverInfo.documentation
			.map((part: DisplayPart) => part.text)
			.join("\n\n")

		if (docs.trim()) contents.push({ value: docs })
	}

	return {
		contents,
		range: getHoverRange(model, hoverInfo.textSpan)
	}
}

const getHoverRange = (
	model: Monaco.editor.ITextModel,
	textSpan: { start: number; length: number }
): Monaco.IRange => {
	const start = model.getPositionAt(textSpan.start)
	const end = model.getPositionAt(textSpan.start + textSpan.length)

	return {
		startLineNumber: start.lineNumber,
		startColumn: start.column,
		endLineNumber: end.lineNumber,
		endColumn: end.column
	}
}

export const setupHoverProvider = (
	monaco: typeof Monaco,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
): void => {
	monaco.languages.registerHoverProvider("typescript", {
		provideHover: async (model, position) => {
			const positionHash = createPositionHash(model, position)
			if (isDuplicateRequest(positionHash)) return null

			const uri = model.uri.toString()
			const offset = model.getOffsetAt(position)
			const hoverInfo = await tsLanguageService.getQuickInfoAtPosition(
				uri,
				offset
			)

			if (!hoverInfo) return null
			return formatHoverInfo(hoverInfo, model)
		}
	})
}
