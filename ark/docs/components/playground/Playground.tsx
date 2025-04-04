"use client"

import { unset } from "@ark/util"
import Editor, { useMonaco } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"
import { loadWASM } from "onigasm"
// Import React explicitly for React.memo
import React, {
	useCallback,
	useEffect,
	useRef,
	useState,
	type RefObject
} from "react"
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

	// on-update validation
	useEffect(() => {
		if (editorRef.current) {
			const currentEditorValue = editorRef.current.getValue()
			if (initialValue !== currentEditorValue) {
				editorRef.current.setValue(initialValue)
				validateNow(initialValue)
			}
		}
	}, [editorRef.current])

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
	validateNow: (code: string) => void
}

const PlaygroundEditor = React.memo(
	({ defaultValue, editorRef, validateNow }: PlaygroundEditorProps) => {
		const handleChange = useCallback(
			(code: string | undefined) => {
				if (code !== undefined) validateNow(code)
			},
			[validateNow]
		)

		const handleMount = useCallback(
			(
				editor: Monaco.editor.IStandaloneCodeEditor,
				monacoInstance: typeof Monaco
			) => {
				editorRef.current = editor
				if (tsLanguageServiceInstance)
					setupErrorLens(monacoInstance, editor, tsLanguageServiceInstance)

				// on-load validation
				validateNow(editor.getValue())

				// on-save (ctrl+s) formatting + validation
				editor.onKeyDown(e => {
					const monaco = (window as any).monaco
					if (!monaco) return
					if (e.keyCode === monaco.KeyCode.KeyS && (e.ctrlKey || e.metaKey)) {
						e.preventDefault()
						formatEditor(editor).then(formattedCode => {
							validateNow(formattedCode ?? editor.getValue())
						})
					}
				})
			},
			[editorRef, validateNow]
		)

		return (
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
					smoothScrolling: true,
					automaticLayout: true
				}}
				onMount={handleMount}
				onChange={handleChange}
			/>
		)
	}
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
