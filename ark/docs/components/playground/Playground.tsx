"use client"

import Editor, { useMonaco } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"
import { loadWASM } from "onigasm"
import prettierPluginEstree from "prettier/plugins/estree"
import prettierPluginTypeScript from "prettier/plugins/typescript"
import prettier from "prettier/standalone"
import { useEffect, useMemo, useRef, useState } from "react"
import { typeJs } from "../bundles/type.ts"
import { setupCompletionProvider } from "./completions.ts"
import { setupErrorLens } from "./errorLens.ts"
import { setupTextmateGrammar, theme } from "./highlights.ts"
import { setupHoverProvider } from "./hovers.ts"
import { getInitializedTypeScriptService } from "./tsserver.ts"
import { TypeExplorer } from "./TypeExplorer.tsx"
import { defaultPlaygroundCode, editorFileUri } from "./utils.ts"
import { ValidationResult } from "./ValidationResult.tsx"

let monacoInitialized = false
let tsLanguageServiceInstance: Monaco.languages.typescript.TypeScriptWorker | null =
	null

// remove the package's exports since they will fail in with new Function()
// instead, they'll be defined directly in the scope being executed
const ambientArktypeJs = typeJs.slice(0, typeJs.lastIndexOf("export {"))
const validationDelayMs = 500

// start loading onigasm in the background even if the Playground is not displayed
const onigasmLoaded =
	globalThis.window &&
	loadWASM("/onigasm.wasm").catch(e => {
		// this often occurs during dev server reloading and can be ignored
		if (!String(e).includes("subsequent calls are not allowed")) throw e
	})

const setupDynamicStyles = (
	editor: Monaco.editor.IStandaloneCodeEditor,
	monaco: typeof Monaco,
	tsLanguageService: Monaco.languages.typescript.TypeScriptWorker
): void => {
	setupErrorLens(monaco, editor, tsLanguageService)
}

const setupMonaco = async (
	monaco: typeof Monaco
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	if (!monacoInitialized) {
		await onigasmLoaded

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

interface ExecutionResult extends ValidationResult.Props, TypeExplorer.Props {}

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
		monacoInitialized ? "loaded" : "unloaded"
	)
	const [validationResult, setValidationResult] = useState<ExecutionResult>({
		result: undefined,
		definition: undefined
	})

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
				result: out,
				definition: MyType?.expression
			})
		} catch (e) {
			setValidationResult({
				result: `❌ RuntimeError: ${e instanceof Error ? e.message : String(e)}`,
				definition: undefined
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
						onChange={code => code && validateCode(code)}
					/>
					<div className="flex flex-col gap-4 h-full">
						<TypeExplorer {...validationResult} />
						<ValidationResult {...validationResult} />
					</div>
				</>
			:	<div className="flex items-center justify-center h-full gap-4">
					<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
					<p className="ml-4 text-lg text-gray-600">Loading playground...</p>
				</div>
			}
		</div>
	)
}
