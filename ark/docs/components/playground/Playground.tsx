"use client"

import Editor, { useMonaco } from "@monaco-editor/react"
import { useEffect, useRef, useState } from "react"
import { ValidationOutput } from "./ValidationOutput.tsx"
import { defaultPlaygroundCode, editorFileUri, setupMonaco } from "./setup.ts"
import { useEditorState } from "./useEditorState.ts"
import { useSaveShortcut } from "./useSaveShortcut.ts"

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
	const [isReady, setReady] = useState(false)
	const monaco = useMonaco()
	const editorRef = useRef<any>(null)

	const { validationResult, validateCode, validateImmediately } =
		useEditorState()

	useSaveShortcut(editorRef, validateImmediately)

	useEffect(() => {
		if (editorRef.current && resetTrigger > 0) {
			editorRef.current.setValue(code)
			validateCode(editorRef.current.getValue())
		}
	}, [resetTrigger, code, validateCode])

	useEffect(() => {
		if (!monaco) return

		setupMonaco(monaco)
			.then(() => setReady(true))
			.catch(err => {
				console.error("Failed to setup Monaco:", err)
			})
	}, [monaco])

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
			{isReady && monaco ?
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
						onMount={editor => {
							editorRef.current = editor
							editor.onDidChangeModelContent(() => {
								validateCode(editor.getValue())
							})
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

export default Playground
