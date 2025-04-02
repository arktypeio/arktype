"use client"

import { hasArkKind } from "@ark/schema"
import { ParseError } from "@ark/util"
import Editor, { useMonaco } from "@monaco-editor/react"
import extensionPackage from "arkdark/package.json" with { type: "json" }
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json" with { type: "json" }
import arkdarkColors from "arkthemes/arkdark.json" with { type: "json" }
import { type } from "arktype"
import type * as Monaco from "monaco-editor"
import { wireTmGrammars } from "monaco-editor-textmate"
import { Registry } from "monaco-textmate"
import { loadWASM } from "onigasm"
import prettierPluginEstree from "prettier/plugins/estree"
import prettierPluginTypeScript from "prettier/plugins/typescript"
import prettier from "prettier/standalone"
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import type { CompletionInfo, ScriptElementKind } from "typescript"
import { schemaDts } from "./bundles/schema.ts"
import { typeDts, typeJs } from "./bundles/type.ts"
import { utilDts } from "./bundles/util.ts"

let onigasmLoaded = false
let monacoInitialized = false
let tsLanguageServiceInstance: Monaco.languages.typescript.TypeScriptWorker | null =
	null

let onigasmPromise: Promise<void> | null = null

// remove the package's exports since they will fail in with new Function()
// instead, they'll be defined directly in the scope being executed
const ambientArktypeJs = typeJs.slice(0, typeJs.lastIndexOf("export {"))
const validationDelayMs = 500

const initOnigasm = async () => {
	if (onigasmPromise) return onigasmPromise

	if (!onigasmLoaded) {
		try {
			onigasmPromise = loadWASM("/onigasm.wasm")
			onigasmLoaded = true
		} catch (e) {
			if (String(e).includes("subsequent calls are not allowed")) {
				// this often happens during dev, ignore it
				return Promise.resolve()
			}
			console.error(e)
			onigasmPromise = null
		}

		return onigasmPromise
	}

	return Promise.resolve()
}

if (typeof window !== "undefined") initOnigasm()

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
const defaultPlaygroundCode = `import { type } from "arktype"

export const MyType = type({
	name: "string",
	age: "number"
})

export const out = MyType({
	name: "Anders Hejlsberg",
	age: null
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
		monaco.editor.createModel(defaultPlaygroundCode, "typescript", targetUri)

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
			const positionHash = createPositionHash(model, position)
			if (isDuplicateRequest(positionHash)) return { suggestions: [] }

			const completions = await getCompletions(
				tsLanguageService,
				model,
				position
			)
			if (!completions) return { suggestions: [] }

			return formatCompletions(completions, model, position)
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
const applyErrorLensReplacements = (message: string): string => {
	for (const transformation of errorLensReplacements) {
		const matchResult = transformation.matcher.exec(message)
		if (matchResult) {
			message = transformation.message
			// replace groups like $0 and $1 with groups from the match
			for (let groupIndex = 0; groupIndex < matchResult.length; groupIndex++) {
				message = message.replace(
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

const errorLensStyles = `
	.error-bg {
		background-color: ${arkdarkColors.colors["errorLens.errorBackground"]};
	}
	.error-text {
		color:  ${arkdarkColors.colors["errorLens.errorForeground"]};
		font-style: italic;
	}
`

const setupErrorLens = (
	monaco: typeof Monaco,
	editor: Monaco.editor.IStandaloneCodeEditor,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
) => {
	const styleElement = document.createElement("style")
	styleElement.textContent = errorLensStyles
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

			messageText = applyErrorLensReplacements(messageText)

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

const editorStyles: CSSProperties = {
	borderRadius: "16px",
	boxShadow:
		"0 10px 15px 0 rgba(0, 0, 0, 0.3), 0 15px 30px 0 rgba(0, 0, 0, 0.22)",
	transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
	backdropFilter: "blur(16px)",
	paddingTop: "16px"
}

const applyEditorStyling = (
	editor: Monaco.editor.IStandaloneCodeEditor,
	monaco: typeof Monaco,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
): void => {
	const editorElement = editor.getDomNode()

	if (editorElement) {
		Object.assign(editorElement.style, editorStyles)

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
	if (!monacoInitialized) {
		await initOnigasm()
		monaco.editor.defineTheme("arkdark", theme)

		if (!tsLanguageServiceInstance) {
			const tsLanguageService = await getInitializedTypeScriptService(monaco)
			setupHoverProvider(monaco, tsLanguageService)
			setupCompletionProvider(monaco, tsLanguageService)
			await setupTextmateGrammar(monaco)

			tsLanguageServiceInstance = tsLanguageService
			monacoInitialized = true
		}
	}

	return tsLanguageServiceInstance!
}

type LoadingState = "unloaded" | "loading" | "loaded"

export interface PlaygroundProps {
	visible?: boolean
	resetTrigger?: number
	/** @default "typescript" */
	lang?: string
	style?: React.CSSProperties
	className?: string
	/** Initial code to display in the playground */
	code?: string
	fullHeight?: boolean
	height?: string
}

export const Playground = ({
	visible = true,
	resetTrigger = 0,
	lang = "typescript",
	style = {},
	className = "",
	code = defaultPlaygroundCode,
	fullHeight = false,
	height = "100%"
}: PlaygroundProps) => {
	const [loadingState, setLoaded] = useState<LoadingState>(
		onigasmLoaded && monacoInitialized ? "loaded" : "unloaded"
	)
	const [validationResult, setValidationResult] =
		useState<ValidationOutputProps>({})

	const monaco = useMonaco()
	const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

	useEffect(() => {
		if (editorRef.current && resetTrigger > 0) {
			editorRef.current.setValue(code)
			validateCode(code)
		}
	}, [resetTrigger, code])

	const validateImmediately = (code: string) => {
		const isolatedUserCode = code
			.replaceAll(/^\s*import .*\n/g, "")
			.replaceAll(/^\s*export\s+const/gm, "const")

		try {
			const wrappedCode = `${ambientArktypeJs}
        ${isolatedUserCode}
        return { MyType, out }`

			const result = new Function(wrappedCode)()
			const { MyType, out } = result

			setValidationResult({
				definition: MyType?.expression,
				result: out
			})
		} catch (e) {
			setValidationResult({
				result: `❌ RuntimeError: ${e instanceof Error ? e.message : String(e)}`
			})
		}
	}

	const validateCode = useMemo(() => {
		let timeoutId: NodeJS.Timeout | null = null
		let lastValidationTime = 0

		return (code: string) => {
			const now = Date.now()
			const timeSinceLastValidation = now - lastValidationTime

			if (timeoutId) {
				clearTimeout(timeoutId)
				timeoutId = null
			}

			if (timeSinceLastValidation > validationDelayMs * 2) {
				lastValidationTime = now
				validateImmediately(code)
			} else {
				timeoutId = setTimeout(() => {
					lastValidationTime = Date.now()
					validateImmediately(code)
				}, validationDelayMs)
			}
		}
	}, [])

	useEffect(() => {
		if (editorRef.current) {
			const disposable = editorRef.current.onDidChangeModelContent(() => {
				validateCode(editorRef.current?.getValue() ?? "")
			})
			return () => disposable.dispose()
		}
	}, [editorRef.current])

	useEffect(() => {
		if (editorRef.current && resetTrigger > 0) editorRef.current.setValue(code)
	}, [resetTrigger, code])

	useEffect(() => {
		if (monaco && monacoInitialized && tsLanguageServiceInstance) {
			setLoaded("loaded")
			return
		}

		if (monaco && loadingState !== "loaded") {
			if (loadingState === "unloaded") setLoaded("loading")
			else {
				setupMonaco(monaco)
					.then(() => {
						setLoaded("loaded")
					})
					.catch(err => {
						console.error("Failed to setup Monaco:", err)
						setLoaded("unloaded")
					})
			}
		}
	}, [monaco, loadingState])

	useEffect(() => {
		if (editorRef.current) {
			const handleKeyDown = async (e: KeyboardEvent) => {
				if ((e.ctrlKey || e.metaKey) && e.key === "s") {
					e.preventDefault()

					if (!editorRef.current) return

					try {
						const editor = editorRef.current
						// Store current state before formatting
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

						// Calculate relative positions before changing content
						const relativePositions = selections?.map(selection => {
							const model = editor.getModel()
							if (!model) return null

							const startOffset = model.getOffsetAt(
								selection.getStartPosition()
							)
							const endOffset = model.getOffsetAt(selection.getEndPosition())
							return {
								start: startOffset / currentCode.length,
								end: endOffset / currentCode.length,
								direction: selection.getDirection()
							}
						})

						// Apply formatted code
						editor.setValue(formattedCode)

						// Restore positions based on relative offsets
						if (selections && relativePositions) {
							const model = editor.getModel()
							if (model) {
								const newSelections = relativePositions
									.map(pos => {
										if (!pos) return null
										const startOffset = Math.floor(
											pos.start * formattedCode.length
										)
										const endOffset = Math.floor(pos.end * formattedCode.length)

										// Find nearest token boundaries
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
									.filter(Boolean) as {} as Monaco.Selection[]

								if (newSelections.length) editor.setSelections(newSelections)
							}
						}

						// Restore scroll position proportionally
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

			// Helper to find nearest token boundary
			const findNearestTokenBoundary = (
				model: Monaco.editor.ITextModel,
				position: Monaco.Position
			): Monaco.Position => {
				const lineContent = model.getLineContent(position.lineNumber)

				// If at line end, stay there
				if (position.column > lineContent.length) return position

				// Find nearest whitespace or token boundary
				let column = position.column
				const char = lineContent[column - 1]

				// If we're in whitespace, find next token
				if (/\s/.test(char)) {
					while (
						column <= lineContent.length &&
						/\s/.test(lineContent[column - 1])
					)
						column++

					if (column > lineContent.length) {
						return new monaco!.Position(
							position.lineNumber,
							lineContent.length + 1
						)
					}
					return new monaco!.Position(position.lineNumber, column)
				}

				// If we're in a token, find token end
				const token = model.getWordAtPosition(position)
				if (token)
					return new monaco!.Position(position.lineNumber, token.endColumn)

				return position
			}

			window.addEventListener("keydown", handleKeyDown)
			return () => window.removeEventListener("keydown", handleKeyDown)
		}
	}, [editorRef.current])

	const containerStyle = {
		display: visible ? "grid" : "none",
		gridTemplateColumns: "1fr 1fr",
		gap: "1rem",
		height: fullHeight ? "calc(100vh - 64px)" : height,
		width: "100%",
		...style
	}

	return (
		<div className={className} style={containerStyle}>
			{loadingState === "loaded" && monaco ?
				<>
					<Editor
						height="100%"
						width="100%"
						defaultLanguage={lang}
						defaultValue={code}
						path={editorFileUri}
						theme="arkdark"
						options={{
							minimap: { enabled: false },
							scrollBeyondLastLine: false,
							quickSuggestions: { strings: "on" },
							quickSuggestionsDelay: 0
						}}
						onMount={(editor, monaco) => {
							editorRef.current = editor
							if (tsLanguageServiceInstance)
								applyEditorStyling(editor, monaco, tsLanguageServiceInstance)
							validateCode(editor.getValue())
						}}
					/>
					<ValidationOutput {...validationResult} />
				</>
			:	<div className="loading-container">
					<div className="loading-text">Loading playground...</div>
				</div>
			}
		</div>
	)
}

interface ValidationOutputProps {
	definition?: string | undefined
	result?: type.errors | ParseError | unknown
}

const successBg = "#081617cc"
const failureBg = "#170808cc"

const ValidationOutput = ({ definition, result }: ValidationOutputProps) => {
	console.log(result)
	return (
		<div className="flex flex-col gap-4 h-full">
			<div className="flex-1 min-h-0">
				<div
					style={{ ...editorStyles, backgroundColor: "#08161791" }}
					className="editor-bg h-full p-4 rounded-2xl overflow-auto"
				>
					<h3 className="text-fd-foreground font-semibold mb-2">Definition</h3>
					<pre className="m-0 whitespace-pre-wrap">
						<code>{definition ?? "// No type defined yet"}</code>
					</pre>
				</div>
			</div>
			<div className="flex-1 min-h-0">
				<div
					style={{
						...editorStyles,
						backgroundColor:
							hasArkKind(result, "errors") ? failureBg : successBg
					}}
					className="h-full p-4 rounded-2xl overflow-auto"
				>
					<h3 className="text-fd-foreground font-semibold mb-2">Output</h3>
					<pre className="m-0 whitespace-pre-wrap">
						<code>
							{result === undefined ?
								null
							: result instanceof type.errors ?
								`❌ problems:\n\n${result.summary}`
							: result instanceof ParseError ?
								`❌ParseError:\n\n${result}`
							:	`✅ data:\n\n${JSON.stringify(result, null, 2)}`}
						</code>
					</pre>
				</div>
			</div>
		</div>
	)
}
