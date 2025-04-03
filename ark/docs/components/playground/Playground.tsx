"use client"

import { hasArkKind } from "@ark/schema"
import { ParseError } from "@ark/util"
import Editor, { useMonaco } from "@monaco-editor/react"
import { type } from "arktype"
import type * as Monaco from "monaco-editor"
import { loadWASM } from "onigasm"
import prettierPluginEstree from "prettier/plugins/estree"
import prettierPluginTypeScript from "prettier/plugins/typescript"
import prettier from "prettier/standalone"
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { typeJs } from "../bundles/type.ts"
import { setupCompletionProvider } from "./completions.ts"
import { setupErrorLens } from "./errorLens.ts"
import { setupTextmateGrammar, theme } from "./highlights.ts"
import { setupHoverProvider } from "./hovers.ts"
import { getInitializedTypeScriptService } from "./tsserver.ts"
import { defaultPlaygroundCode, editorFileUri } from "./utils.ts"

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

if (globalThis.window !== undefined) initOnigasm()

const editorStyles: CSSProperties = {
	borderRadius: "16px",
	boxShadow:
		"0 10px 15px 0 rgba(0, 0, 0, 0.3), 0 15px 30px 0 rgba(0, 0, 0, 0.22)",
	transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
	backdropFilter: "blur(16px)",
	paddingTop: "16px"
}

const setupDynamicStyles = (
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
								setupDynamicStyles(editor, monaco, tsLanguageServiceInstance)
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
