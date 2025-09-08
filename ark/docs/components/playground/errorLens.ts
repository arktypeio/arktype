import extensionPackage from "arkdark/package.json" with { type: "json" }
import arkdarkColors from "arkthemes/arkdark.json" with { type: "json" }
import type * as Monaco from "monaco-editor"

export const setupErrorLens = (
	monaco: typeof Monaco,
	editor: Monaco.editor.IStandaloneCodeEditor,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
) => {
	const styleElement = document.createElement("style")
	styleElement.textContent = styles
	document.head.appendChild(styleElement)

	let decorationCollection: Monaco.editor.IEditorDecorationsCollection | null =
		null

	const updateDiagnostics = async () => {
		const diagnostics = await getDiagnostics(
			tsLanguageService,
			editor.getModel()!
		)

		if (decorationCollection) decorationCollection.clear()

		const model = editor.getModel()
		if (!model) return

		// group diagnostics by line to only show one error per line
		const diagnosticsByLine = new Map<
			number,
			Monaco.languages.typescript.Diagnostic
		>()

		for (const diag of diagnostics) {
			if (!diag.start) continue
			const startPosition = model.getPositionAt(diag.start)
			const lineNumber = startPosition.lineNumber

			if (!diagnosticsByLine.has(lineNumber))
				diagnosticsByLine.set(lineNumber, diag)
		}

		const decorations: Monaco.editor.IModelDeltaDecoration[] = Array.from(
			diagnosticsByLine.entries()
		).map(([lineNumber, diag]) => {
			let messageText =
				typeof diag.messageText === "object" ?
					diag.messageText.messageText
				:	diag.messageText

			messageText = applyReplacements(messageText)

			const lineContent = model.getLineContent(lineNumber)
			const endOfLine = lineContent.length + 1

			return {
				range: new monaco.Range(lineNumber, 1, lineNumber, endOfLine),
				options: {
					isWholeLine: true,
					className: "error-bg",
					after: {
						content: `    ${messageText}`,
						inlineClassName: "error-text"
					}
				}
			}
		})

		decorationCollection = editor.createDecorationsCollection(decorations)
	}

	updateDiagnostics()

	editor.onDidChangeModelContent(() => {
		// small delay to allow TS service to process changes
		setTimeout(updateDiagnostics, 300)
	})
}

type ErrorLensReplacement = {
	matcher: RegExp
	message: string
}

const errorLensReplacements: ErrorLensReplacement[] =
	extensionPackage.contributes.configurationDefaults["errorLens.replace"].map(
		src => ({ matcher: new RegExp(src.matcher, "iu"), message: src.message })
	)

// apply errorLens.replace config to diagnostic message,
// extracting arktype errors for inline display based on:
// https://github.com/usernamehw/vscode-error-lens/blob/019d29b010f85ebb6e25c5f7f8ffda83479bfda0/src/utils/extUtils.ts#L184
const applyReplacements = (message: string): string => {
	for (const transformation of errorLensReplacements) {
		const matchResult = transformation.matcher.exec(message)
		if (matchResult) {
			message = transformation.message
			// replace groups like $0 and $1 with groups from the match
			for (let groupIndex = 0; groupIndex < matchResult.length; groupIndex++) {
				message = message.replaceAll(
					new RegExp(`\\$${groupIndex}`, "gu"),
					matchResult[Number(groupIndex)]
				)
			}

			return message
		}
	}

	return message
}

const getDiagnostics = async (
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker,
	model: Monaco.editor.ITextModel
): Promise<Monaco.languages.typescript.Diagnostic[]> => {
	const uri = model.uri.toString()
	const syntacticDiagnostics =
		await tsLanguageService.getSyntacticDiagnostics(uri)
	const semanticDiagnostics =
		await tsLanguageService.getSemanticDiagnostics(uri)

	return [...syntacticDiagnostics, ...semanticDiagnostics]
}

const styles = `
    .error-bg {
        background-color: ${arkdarkColors.colors["errorLens.errorBackground"]};
    }
    .error-text {
        color:  ${arkdarkColors.colors["errorLens.errorForeground"]};
        font-style: italic;
    }
`
