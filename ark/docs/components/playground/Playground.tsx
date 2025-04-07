"use client"

import { unset } from "@ark/util"
import Editor, { useMonaco } from "@monaco-editor/react"
import { type } from "arktype"
import type * as Monaco from "monaco-editor"
import { loadWASM } from "onigasm"
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
import { RestoreDefault } from "./RestoreDefault.tsx"
import { ShareLink } from "./ShareLink.tsx"
import { TraverseResult } from "./TraverseResult.tsx"
import { getInitializedTypeScriptService } from "./tsserver.ts"
import {
	defaultPlaygroundCode,
	editorFileUri,
	updatePlaygroundUrl
} from "./utils.ts"

let monacoInitialized = false
let tsLanguageServiceInstance: Monaco.languages.typescript.TypeScriptWorker | null =
	null

const onigasmLoaded =
	globalThis.window &&
	loadWASM("/onigasm.wasm").catch(e => {
		if (!String(e).includes("subsequent calls are not allowed")) throw e
	})

const setupMonaco = async (
	monaco: typeof Monaco,
	initialValue: string
): Promise<Monaco.languages.typescript.TypeScriptWorker> => {
	if (!monacoInitialized) {
		await onigasmLoaded
		monaco.editor.defineTheme("arkdark", theme)
		if (!tsLanguageServiceInstance) {
			const ts = await getInitializedTypeScriptService(
				monaco,
				editorFileUri,
				initialValue
			)
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
		parsed: type.unknown,
		traversed: unset
	})

	const monaco = useMonaco()
	const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
	const [currentCode, setCurrentCode] = useState<string>(initialValue)

	// ts + monaco initialization
	useEffect(() => {
		if (monaco && monacoInitialized && tsLanguageServiceInstance) {
			setLoaded("loaded")
			return
		}
		if (monaco && loadingState !== "loaded") {
			if (loadingState === "unloaded") setLoaded("loading")
			else {
				setupMonaco(monaco, initialValue)
					.then(() => setLoaded("loaded"))
					.catch(err => {
						console.error("Failed to setup Monaco:", err)
						setLoaded("unloaded")
					})
			}
		}
	}, [monaco, loadingState, initialValue])

	const validateNow = useCallback((code: string) => {
		const result = executeCode(code)
		setValidationResult(result)
		setCurrentCode(code)
	}, [])

	const shareCode = useCallback(() => {
		if (editorRef.current) {
			const code = editorRef.current.getValue()
			const url = updatePlaygroundUrl(code)
			return url
		}
		return ""
	}, [editorRef])

	// handle external changes to initialValue (e.g., URL change)
	useEffect(() => {
		if (editorRef.current) {
			const currentEditorValue = editorRef.current.getValue()
			if (initialValue !== currentEditorValue)
				editorRef.current.setValue(initialValue)
		}
		setCurrentCode(initialValue)
		validateNow(initialValue)
	}, [initialValue, validateNow])

	const restoreDefault = () => {
		editorRef.current?.setValue(defaultPlaygroundCode)
		updatePlaygroundUrl(defaultPlaygroundCode)
		validateNow(defaultPlaygroundCode)
	}

	return (
		<div
			className={className}
			style={{
				display: "grid",
				gridTemplateColumns: withResults ? "minmax(400px, 1fr) 600px" : "1fr",
				gap: "1rem",
				width: "100%",
				height: "100%",
				alignItems: "stretch",
				...style
			}}
		>
			{loadingState === "loaded" && monaco ?
				<>
					<PlaygroundEditor
						defaultValue={currentCode}
						validateNow={validateNow}
						editorRef={editorRef}
						restoreDefault={restoreDefault}
						shareCode={shareCode}
						withResults={withResults}
					/>
					{withResults && (
						<PlaygroundResults
							{...validationResult}
							restoreDefault={restoreDefault}
						/>
					)}
				</>
			:	<PlaygroundLoader />}
		</div>
	)
}

type PlaygroundEditorProps = {
	defaultValue: string
	editorRef: RefObject<Monaco.editor.IStandaloneCodeEditor | null>
	validateNow: (code: string) => void
	restoreDefault: () => void
	shareCode: () => string
	withResults: boolean | undefined
}

const PlaygroundEditor = React.memo(
	({
		defaultValue,
		editorRef,
		validateNow,
		restoreDefault,
		shareCode,
		withResults
	}: PlaygroundEditorProps) => {
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

				// on-save (ctrl+s) formatting + validation, update URL
				editor.onKeyDown(e => {
					const monaco = (window as any).monaco
					if (!monaco) return
					if (e.keyCode === monaco.KeyCode.KeyS && (e.ctrlKey || e.metaKey)) {
						e.preventDefault()
						formatEditor(editor).then(formattedCode => {
							const codeToSave = formattedCode ?? editor.getValue()
							if (formattedCode) editor.setValue(formattedCode)
							validateNow(codeToSave)
							shareCode()
						})
					}
				})
			},
			[editorRef, shareCode, validateNow]
		)

		return (
			<div className="relative">
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
				{
					// only include these buttons in expanded mode
					withResults ?
						<div className="absolute top-2 right-2 flex gap-2">
							<ShareLink onShare={shareCode} />
							<RestoreDefault variant="icon" onClick={restoreDefault} />
						</div>
					:	null
				}
			</div>
		)
	}
)

interface PlaygroundResultsProps extends ExecutionResult {
	restoreDefault: () => void
}

const PlaygroundLoader = () => (
	<div className="flex items-center justify-center h-full gap-4">
		<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
		<p className="ml-4 text-lg text-gray-600">Loading playground...</p>
	</div>
)

const PlaygroundResults = (result: PlaygroundResultsProps) => (
	<div className="flex flex-col h-full gap-4">
		<div className="flex-[2] min-h-0">
			<ParseResult {...result} />
		</div>
		<div className="flex-[1] min-h-0">
			<TraverseResult {...result} />
		</div>
	</div>
)
