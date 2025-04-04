"use client"

import { unset } from "@ark/util"
import Editor, { useMonaco } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"
import { loadWASM } from "onigasm"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { setupCompletionProvider } from "./completions.ts"
import { setupErrorLens } from "./errorLens.ts"
import { executeCode, type ExecutionResult } from "./execute.ts"
import { formatEditor } from "./format.ts"
import { setupTextmateGrammar, theme } from "./highlights.ts"
import { setupHoverProvider } from "./hovers.ts"
import { ParseResult } from "./ParseResult.tsx"
import { TraverseResult } from "./TraverseResult.tsx"
import { getInitializedTypeScriptService } from "./tsserver.ts"
import { editorFileUri } from "./utils.ts"

let monacoInitialized = false
let tsLanguageServiceInstance: Monaco.languages.typescript.TypeScriptWorker | null =
	null

const onigasmLoaded =
	globalThis.window &&
	loadWASM("/onigasm.wasm").catch(e => {
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
			const ts = await getInitializedTypeScriptService(monaco)
			setupHoverProvider(monaco, ts)
			setupCompletionProvider(monaco, ts)
			await setupTextmateGrammar(monaco)
			tsLanguageServiceInstance = ts
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
		parsed: unset,
		traversed: unset
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
					.then(() => setLoaded("loaded"))
					.catch(err => {
						console.error("Failed to setup Monaco:", err)
						setLoaded("unloaded")
					})
			}
		}
	}, [monaco, loadingState])

	const validateNow = useCallback((code: string) => {
		const result = executeCode(code)
		setValidationResult(result)
	}, [])

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
				gridTemplateColumns: withResults ? "minmax(400px, 1fr) 600px" : "1fr",
				gap: "1rem",
				height: "100%",
				width: "100%",
				...style
			}}
		>
			{loadingState === "loaded" && monaco ?
				<>
					<PlaygroundEditor
						defaultValue={initialValue}
						validateIncremental={validateNow}
						validateNow={validateNow}
						editorRef={editorRef}
					/>
					{withResults && <PlaygroundResults {...validationResult} />}
				</>
			:	<PlaygroundLoader />}
		</div>
	)
}

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
		<ParseResult {...result} />
		<TraverseResult {...result} />
	</div>
)

const PlaygroundLoader = () => (
	<div className="flex items-center justify-center h-full gap-4">
		<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
		<p className="ml-4 text-lg text-gray-600">Loading playground...</p>
	</div>
)
