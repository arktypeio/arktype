"use client"

import Editor, { useMonaco } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"
import { loadWASM } from "onigasm"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { useDebouncedCallback } from "use-debounce"
import { typeJs } from "../bundles/type.ts"
import { setupCompletionProvider } from "./completions.ts"
import { setupErrorLens } from "./errorLens.ts"
import { formatEditor } from "./format.ts"
import { setupTextmateGrammar, theme } from "./highlights.ts"
import { setupHoverProvider } from "./hovers.ts"
import { getInitializedTypeScriptService } from "./tsserver.ts"
import { TypeExplorer } from "./TypeExplorer.tsx"
import { editorFileUri } from "./utils.ts"
import { ValidationResult } from "./ValidationResult.tsx"

export const Playground = ({
	initialValue,
	style,
	className,
	withResults
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

	// ts + monaco initialization
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

	// Define the core validation logic. useCallback ensures it has a stable reference
	// unless its dependencies change (none in this case, but good practice).
	const validateNow = useCallback((code: string) => {
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
	}, [])

	const debouncedValidateCode = useDebouncedCallback(
		validateNow,
		validationDelayMs
	)

	// on-load validation
	useEffect(() => {
		if (editorRef.current) {
			const currentEditorValue = editorRef.current.getValue()
			if (initialValue !== currentEditorValue) {
				editorRef.current.setValue(initialValue)
				validateNow(initialValue)
			}
		}
	}, [initialValue, validateNow])

	// on-save (ctrl+s) formatting + validation
	useEffect(() => {
		const editor = editorRef.current
		if (!editor) return

		const handleKeyDown = async (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault()
				const formattedCode = await formatEditor(editor)
				validateNow(formattedCode ?? editor.getValue())
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [editorRef.current, validateNow])

	return (
		<div
			className={className}
			style={{
				display: "grid",
				gridTemplateColumns: withResults ? "1fr minmax(0, 450px)" : "1fr",
				gap: "1rem",
				height: "100%",
				outline: "none",
				...style
			}}
		>
			{loadingState === "loaded" && monaco ?
				<>
					<PlaygroundEditor
						defaultValue={initialValue}
						validateIncremental={debouncedValidateCode}
						validateNow={validateNow}
						editorRef={editorRef}
					/>
					{withResults && <PlaygroundResults {...validationResult} />}
				</>
			:	<PlaygroundLoader />}
		</div>
	)
}

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
	initialValue: string
	style?: React.CSSProperties
	className?: string
	withResults?: boolean
}

interface ExecutionResult extends ValidationResult.Props, TypeExplorer.Props {}

type PlaygroundEditorProps = {
	defaultValue: string
	editorRef: RefObject<Monaco.editor.IStandaloneCodeEditor | null>
	validateIncremental: (code: string) => void
	validateNow: (code: string) => void
}

const PlaygroundEditor = ({
	defaultValue,
	editorRef,
	validateIncremental,
	validateNow
}: PlaygroundEditorProps) => (
	<Editor
		width="100%"
		defaultLanguage="typescript"
		defaultValue={defaultValue}
		path={editorFileUri}
		theme="arkdark"
		options={{
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			quickSuggestions: { strings: "on" },
			quickSuggestionsDelay: 0,
			smoothScrolling: true
		}}
		onMount={(editor, monaco) => {
			editorRef.current = editor
			if (tsLanguageServiceInstance)
				setupDynamicStyles(editor, monaco, tsLanguageServiceInstance)
			validateNow(editor.getValue())
		}}
		onChange={code => code && validateIncremental(code)}
	/>
)

const PlaygroundResults = (result: ExecutionResult) => (
	<div className="flex flex-col gap-4 h-full">
		<TypeExplorer {...result} />
		<ValidationResult {...result} />
	</div>
)

const PlaygroundLoader = () => (
	<div className="flex items-center justify-center h-full gap-4">
		<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
		<p className="ml-4 text-lg text-gray-600">Loading playground...</p>
	</div>
)
