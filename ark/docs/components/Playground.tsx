"use client"

import Editor, { useMonaco } from "@monaco-editor/react"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import arkdarkColors from "arkthemes/arkdark.json"
import type * as Monaco from "monaco-editor"
import { wireTmGrammars } from "monaco-editor-textmate"
import { Registry } from "monaco-textmate"
import { loadWASM } from "onigasm"
import { useEffect, useState } from "react"
import type { CompletionInfo, ScriptElementKind } from "typescript"
import { schemaDts } from "./dts/schema.ts"
import { typeDts } from "./dts/type.ts"
import { utilDts } from "./dts/util.ts"

interface VSCodeTheme {
	colors: {
		[name: string]: string
	}
	tokenColors: TokenColor[]
}

interface TokenColor {
	scope: string | string[]
	settings: {
		foreground?: string
		background?: string
		fontStyle?: string
	}
}

type DisplayPart = {
	text: string
}

type RequestMap = Map<string, number>

const duplicateThresholdMs = 50
const defaultCode = `import { type } from "arktype"

const myType = type({
	name: "string",
	age: "number"
})
`
const editorFileUri = "file:///main.ts"

const recentRequests: RequestMap = new Map()

const createPositionHash = (
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
): string => `${model.uri}:${position.lineNumber}:${position.column}`

const isDuplicateRequest = (positionHash: string): boolean => {
	const now = Date.now()
	const lastRequest = recentRequests.get(positionHash)

	if (lastRequest && now - lastRequest < duplicateThresholdMs) return true

	recentRequests.set(positionHash, now)
	return false
}

const vsCodeThemeToMonaco = (
	theme: VSCodeTheme
): Monaco.editor.IStandaloneThemeData => ({
	base: "vs-dark",
	inherit: false,
	colors: theme.colors,
	rules: arkdarkColors.tokenColors.flatMap(c =>
		Array.isArray(c.scope) ?
			c.scope.map(token => ({ token, ...c.settings }))
		:	[{ token: c.scope, ...c.settings }]
	)
})

const theme = vsCodeThemeToMonaco(arkdarkColors)

// Mirror Monaco.languages.CompletionItemKind
// since importing Monaco directly at runtime causes issues
const MonacoCompletionKind = {
	Method: 0,
	Function: 1,
	Constructor: 2,
	Field: 3,
	Variable: 4,
	Class: 5,
	Struct: 6,
	Interface: 7,
	Module: 8,
	Property: 9,
	Event: 10,
	Operator: 11,
	Unit: 12,
	Value: 13,
	Constant: 14,
	Enum: 15,
	EnumMember: 16,
	Keyword: 17,
	Text: 18,
	Color: 19,
	File: 20,
	Reference: 21,
	Customcolor: 22,
	Folder: 23,
	TypeParameter: 24,
	User: 25,
	Issue: 26,
	Snippet: 27
} as const

const tsToMonacoCompletionKinds: Record<
	ScriptElementKind,
	Monaco.languages.CompletionItemKind
> = {
	"": MonacoCompletionKind.Text,

	// Variable declarations
	const: MonacoCompletionKind.Constant,
	let: MonacoCompletionKind.Variable,
	var: MonacoCompletionKind.Variable,
	"local var": MonacoCompletionKind.Variable,

	// Functions and methods
	function: MonacoCompletionKind.Function,
	"local function": MonacoCompletionKind.Function,
	"local class": MonacoCompletionKind.Class,
	method: MonacoCompletionKind.Method,
	getter: MonacoCompletionKind.Method,
	setter: MonacoCompletionKind.Method,
	constructor: MonacoCompletionKind.Constructor,

	// Types, interfaces, and classes
	class: MonacoCompletionKind.Class,
	interface: MonacoCompletionKind.Interface,
	enum: MonacoCompletionKind.Enum,
	type: MonacoCompletionKind.Reference,
	"enum member": MonacoCompletionKind.EnumMember,
	"primitive type": MonacoCompletionKind.Value,
	"type parameter": MonacoCompletionKind.TypeParameter,
	alias: MonacoCompletionKind.Reference,

	// Properties and parameters
	property: MonacoCompletionKind.Property,
	parameter: MonacoCompletionKind.Variable,

	// Modules, scripts, and file system
	module: MonacoCompletionKind.Module,
	script: MonacoCompletionKind.File,
	directory: MonacoCompletionKind.Folder,

	// Special types
	keyword: MonacoCompletionKind.Keyword,
	call: MonacoCompletionKind.Function,
	index: MonacoCompletionKind.Value,
	construct: MonacoCompletionKind.Constructor,
	"JSX attribute": MonacoCompletionKind.Property,
	string: MonacoCompletionKind.Constant,
	link: MonacoCompletionKind.Reference,
	"link name": MonacoCompletionKind.Text,
	"link text": MonacoCompletionKind.Text,
	label: MonacoCompletionKind.Text,
	warning: MonacoCompletionKind.Issue,
	using: MonacoCompletionKind.Keyword,
	"await using": MonacoCompletionKind.Keyword,
	accessor: MonacoCompletionKind.Keyword,
	"external module name": MonacoCompletionKind.Module
}

const configureTypeScript = (monaco: typeof Monaco): void => {
	const tsDefaultModeConfig = (
		monaco.languages.typescript.typescriptDefaults as any
	)._modeConfiguration
	tsDefaultModeConfig.hovers = false
	tsDefaultModeConfig.completionItems = false

	monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
		strict: true,
		exactOptionalPropertyTypes: true,
		target: monaco.languages.typescript.ScriptTarget.ESNext,
		moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
		allowNonTsExtensions: true
	})

	monaco.languages.typescript.typescriptDefaults.addExtraLib(utilDts)
	monaco.languages.typescript.typescriptDefaults.addExtraLib(schemaDts)
	monaco.languages.typescript.typescriptDefaults.addExtraLib(typeDts)
}

const getInitializedTypeScriptService = async (
	monaco: typeof Monaco,
	targetUri = monaco.Uri.parse(editorFileUri)
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	configureTypeScript(monaco)

	if (!monaco.editor.getModel(targetUri))
		monaco.editor.createModel(defaultCode, "typescript", targetUri)

	const worker = await monaco.languages.typescript.getTypeScriptWorker()
	return await worker(targetUri)
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

const setupHoverProvider = (
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

const getCompletions = async (
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker,
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
) => {
	const uri = model.uri.toString()
	const offset = model.getOffsetAt(position)
	return await tsLanguageService.getCompletionsAtPosition(uri, offset)
}

const formatCompletions = (
	completions: CompletionInfo,
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
) => {
	const suggestions = completions.entries.map(entry => {
		const start =
			entry.replacementSpan ?
				model.getPositionAt(entry.replacementSpan.start)
			:	position

		const end =
			entry.replacementSpan ?
				model.getPositionAt(
					entry.replacementSpan.start + entry.replacementSpan.length
				)
			:	position

		const range = {
			startLineNumber: start.lineNumber,
			startColumn: start.column,
			endLineNumber: end.lineNumber,
			endColumn: end.column
		}

		return {
			label: entry.name,
			kind: tsToMonacoCompletionKinds[entry.kind],
			insertText: entry.name,
			range,
			sortText: entry.sortText,
			detail: entry.kind
		}
	})

	return { suggestions }
}

const setupCompletionProvider = (
	monaco: typeof Monaco,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
) =>
	monaco.languages.registerCompletionItemProvider("typescript", {
		triggerCharacters: [".", '"', "'", "`", "/", "@", "<", "#", " "],
		provideCompletionItems: async (model, position) => {
			try {
				const positionHash = createPositionHash(model, position)
				if (isDuplicateRequest(positionHash)) return { suggestions: [] }

				const completions = await getCompletions(
					tsLanguageService,
					model,
					position
				)
				if (!completions) return { suggestions: [] }

				return formatCompletions(completions, model, position)
			} catch (error) {
				console.error("Error providing completions:", error)
				return { suggestions: [] }
			}
		}
	})

const setupTextmateGrammar = async (monaco: typeof Monaco) =>
	await wireTmGrammars(
		monaco,
		new Registry({
			getGrammarDefinition: async () => ({
				format: "json",
				content: arktypeTextmate
			})
		}),
		new Map().set("typescript", "source.ts")
	)

const getDiagnostics = async (
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker,
	model: Monaco.editor.ITextModel
) => {
	const uri = model.uri.toString()
	// Get both syntactic and semantic diagnostics
	const syntacticDiagnostics =
		await tsLanguageService.getSyntacticDiagnostics(uri)
	const semanticDiagnostics =
		await tsLanguageService.getSemanticDiagnostics(uri)

	// Combine both types of diagnostics
	return [...syntacticDiagnostics, ...semanticDiagnostics]
}

const displayDiagnostics = (
	editor: Monaco.editor.IStandaloneCodeEditor,
	monaco: typeof Monaco,
	diagnostics: any[]
) => {
	const model = editor.getModel()
	if (!model) return

	// Clear previous decorations
	const oldDecorations = model
		.getAllDecorations()
		.filter(
			d =>
				d.options.className === "error-lens-line" ||
				d.options.afterContentClassName === "error-lens-message" ||
				d.options.className === "error-lens-inline-highlight"
		)
		.map(d => d.id)

	if (oldDecorations.length > 0) editor.deltaDecorations(oldDecorations, [])

	// Create new decorations for diagnostics
	const decorations = diagnostics.flatMap(diag => {
		const startPosition = model.getPositionAt(diag.start)
		const endPosition = model.getPositionAt(diag.start + diag.length)
		const lineNumber = startPosition.lineNumber

		// Get the error message (handle nested error objects)
		const messageText =
			typeof diag.messageText === "object" ?
				diag.messageText.messageText
			:	diag.messageText

		// Get the line content to determine the end column
		const lineContent = model.getLineContent(lineNumber)
		const endOfLine = lineContent.length + 1 // +1 because columns are 1-indexed

		// Two decorations: one for the line background + message, one for the underline
		return [
			// Line background + error message at end of line
			{
				range: new monaco.Range(
					lineNumber,
					1, // Start of line
					lineNumber,
					endOfLine // End of line
				),
				options: {
					isWholeLine: true,
					className: "error-lens-line",
					after: {
						content: `    ${messageText}`,
						afterContentClassName: "error-lens-message"
					}
				}
			},
			// Wavy underline at the exact error position
			{
				range: new monaco.Range(
					startPosition.lineNumber,
					startPosition.column,
					endPosition.lineNumber,
					endPosition.column
				),
				options: {
					className: "error-lens-inline-highlight",
					inlineClassName: "error-lens-inline"
				}
			}
		]
	})

	editor.deltaDecorations([], decorations)
}

const setupErrorLens = (
	monaco: typeof Monaco,
	editor: Monaco.editor.IStandaloneCodeEditor,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
) => {
	// Add CSS styles
	const styleElement = document.createElement("style")
	styleElement.textContent = `
		.error-lens-line {
			background-color: rgba(255, 0, 0, 0.1);
		}
		.error-lens-inline {
			text-decoration: wavy underline rgba(255, 0, 0, 0.7);
		}
		.error-lens-inline-highlight {
			/* Style for the container of the inline element */
		}
		.error-lens-message {
			color: #ff6666;
			margin-left: 10px;
			font-style: italic;
		}
	`
	document.head.appendChild(styleElement)

	// Initial diagnostics check
	getDiagnostics(tsLanguageService, editor.getModel()!).then(diagnostics => {
		displayDiagnostics(editor, monaco, diagnostics)
	})

	// Update diagnostics whenever content changes
	editor.onDidChangeModelContent(async () => {
		// Small delay to allow TS service to process changes
		setTimeout(async () => {
			const diagnostics = await getDiagnostics(
				tsLanguageService,
				editor.getModel()!
			)
			displayDiagnostics(editor, monaco, diagnostics)
		}, 300)
	})
}

const applyEditorStyling = (
	editor: Monaco.editor.IStandaloneCodeEditor,
	monaco: typeof Monaco,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
): void => {
	const editorElement = editor.getDomNode()

	if (editorElement) {
		editorElement.style.borderRadius = "16px"
		editorElement.style.boxShadow =
			"0 10px 15px 0 rgba(0, 0, 0, 0.3), 0 15px 30px 0 rgba(0, 0, 0, 0.22)"
		editorElement.style.transition = "all 0.3s cubic-bezier(.25,.8,.25,1)"
		editorElement.style.backdropFilter = "blur(16px)"

		const guard = editorElement.querySelector(
			".overflow-guard"
		) as HTMLElement | null

		if (guard) guard.style.borderRadius = "16px"
	}

	// Setup error lens functionality
	setupErrorLens(monaco, editor, tsLanguageService)
}

const setupMonaco = async (
	monaco: typeof Monaco
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	await loadWASM("/onigasm.wasm")

	monaco.editor.defineTheme("arkdark", theme)

	const tsLanguageService = await getInitializedTypeScriptService(monaco)
	setupHoverProvider(monaco, tsLanguageService)
	setupCompletionProvider(monaco, tsLanguageService)

	await setupTextmateGrammar(monaco)

	return tsLanguageService
}

type LoadingState = "unloaded" | "loading" | "loaded"

export const Playground = () => {
	const [loadingState, setLoaded] = useState<LoadingState>("unloaded")
	const monaco = useMonaco()
	const [tsLanguageService, setTsLanguageService] =
		useState<Monaco.languages.typescript.TypeScriptWorker | null>(null)

	useEffect(() => {
		if (!monaco || loadingState === "loaded") return

		if (loadingState === "unloaded") setLoaded("loading")
		else {
			setupMonaco(monaco).then(service => {
				setTsLanguageService(service)
				setLoaded("loaded")
			})
		}
	}, [monaco, loadingState])

	return loadingState === "loaded" && monaco && tsLanguageService ?
			<Editor
				height="30vh"
				defaultLanguage="typescript"
				defaultValue={defaultCode}
				path={editorFileUri}
				theme="arkdark"
				options={{
					minimap: { enabled: false },
					scrollBeyondLastLine: false,
					quickSuggestions: { strings: "on" },
					quickSuggestionsDelay: 0
				}}
				onMount={editor =>
					applyEditorStyling(editor, monaco, tsLanguageService)
				}
			/>
		:	"Loading..."
}
