"use client"

import Editor, { useMonaco } from "@monaco-editor/react"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import arkdarkColors from "arkthemes/arkdark.json"
import type * as Monaco from "monaco-editor"
import { wireTmGrammars } from "monaco-editor-textmate"
import { Registry } from "monaco-textmate"
import { loadWASM } from "onigasm"
import { useState } from "react"
import type { CompletionInfo, ScriptElementKind } from "typescript"

interface IVSCodeTheme {
	colors: {
		[name: string]: string
	}
	tokenColors: ITokenColor[]
}

interface ITokenColor {
	scope: string | string[]
	settings: {
		foreground?: string
		background?: string
		fontStyle?: string
	}
}

const translateVSCodeTheme = (
	theme: IVSCodeTheme
): Monaco.editor.IStandaloneThemeData => {
	theme.colors["editor.background"] = "#f5cf8f0a"
	return {
		base: "vs-dark",
		inherit: false,
		colors: theme.colors,
		rules: theme.tokenColors.flatMap(c => {
			if (Array.isArray(c.scope)) {
				return c.scope.map(
					sub =>
						({
							token: sub,
							background: c.settings.background,
							foreground: c.settings.foreground,
							fontStyle: c.settings.fontStyle
						}) as Monaco.editor.ITokenThemeRule
				)
			}
			return {
				token: c.scope,
				background: c.settings.background,
				foreground: c.settings.foreground,
				fontStyle: c.settings.fontStyle
			} as Monaco.editor.ITokenThemeRule
		})
	}
}

const theme = translateVSCodeTheme(arkdarkColors)

// mirrors Monaco.languages.CompletionItemKind
// since importing Monaco directly at runtime causes issues
const MonacoCompletionItemKind = {
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

// Track recent completion requests to avoid duplicates
const recentCompletionRequests = new Map<string, number>()
const DUPLICATE_THRESHOLD_MS = 50 // Threshold to consider a request a duplicate

/**
 * Gets an initialized TypeScript language service
 */
const getInitializedTypeScriptService = async (
	monaco: typeof Monaco,
	// This is the actual editor URI
	targetUri = monaco.Uri.parse("file:///main.ts")
): Promise<any> => {
	// Check if TypeScript is available
	if (!monaco.languages.typescript) {
		console.warn("TypeScript not registered yet, retrying...")
		return new Promise(resolve =>
			setTimeout(
				() => resolve(getInitializedTypeScriptService(monaco, targetUri)),
				200
			)
		)
	}

	try {
		// Initialize TypeScript with a dummy model if needed
		const dummyUri = monaco.Uri.parse("file:///dummy.ts")
		if (!monaco.editor.getModel(dummyUri))
			monaco.editor.createModel("// TS init", "typescript", dummyUri)

		// Get the TypeScript worker and create a client
		const worker = await monaco.languages.typescript.getTypeScriptWorker()
		const client = await worker(targetUri)

		// Verify it's working by making a simple call
		if (targetUri.toString().endsWith("dummy.ts"))
			await client.getSyntacticDiagnostics(targetUri.toString())

		return client
	} catch (error) {
		console.error("TypeScript initialization failed, retrying...", error)
		return new Promise(resolve =>
			setTimeout(
				() => resolve(getInitializedTypeScriptService(monaco, targetUri)),
				200
			)
		)
	}
}

const setupMonaco = async (monaco: typeof Monaco) => {
	await loadWASM("/onigasm.wasm")
	monaco.editor.defineTheme("arkdark", theme)

	// Get an initialized TypeScript service
	const tsLanguageService = await getInitializedTypeScriptService(monaco)

	// Configure completion provider with the initialized service Monaco doesn't
	// trigger string completions by default without some hacking (clearly) This
	// solution was based on this issue:
	// https://github.com/microsoft/monaco-editor/issues/2883

	// Then adaptated the fixes mentioned there to avoid other issues
	// like duplicate suggestions and race conditions for ts initialization
	monaco.languages.registerCompletionItemProvider("typescript", {
		triggerCharacters: ['"', "'", "`"],
		provideCompletionItems: async (model, position) => {
			try {
				// Create a unique key for this completion request
				const requestKey = `${model.uri.toString()}:${position.lineNumber}:${position.column}`
				const now = Date.now()

				// Check if this is a duplicate request
				if (recentCompletionRequests.has(requestKey)) {
					const lastRequestTime = recentCompletionRequests.get(requestKey)!
					if (now - lastRequestTime < DUPLICATE_THRESHOLD_MS) {
						// Skip this request as it's a duplicate
						return { suggestions: [] }
					}
				}

				// Record this request
				recentCompletionRequests.set(requestKey, now)

				// Clean up old requests (keep map size manageable)
				if (recentCompletionRequests.size > 100) {
					const oldThreshold = now - 5000 // 5 seconds
					for (const [key, timestamp] of recentCompletionRequests.entries())
						if (timestamp < oldThreshold) recentCompletionRequests.delete(key)
				}

				const uri = model.uri.toString()
				const offset = model.getOffsetAt(position)

				// Request completions from the initialized service
				const completions: CompletionInfo | undefined =
					await tsLanguageService.getCompletionsAtPosition(uri, offset)

				if (!completions) return { suggestions: [] }

				const monacoSuggestions: Monaco.languages.CompletionItem[] = []

				for (let i = 0; i < completions.entries.length; i++) {
					const tsSuggestion = completions.entries[i]

					if (tsSuggestion.kind !== "string") continue

					const word = model.getWordUntilPosition(position)
					const range = {
						startLineNumber: position.lineNumber,
						endLineNumber: position.lineNumber,
						startColumn: word.startColumn,
						endColumn: word.endColumn
					}

					const monacoSuggestion: Monaco.languages.CompletionItem = {
						label: tsSuggestion.name,
						kind: MonacoCompletionItemKind.Constant,
						insertText: tsSuggestion.name,
						range,
						sortText: tsSuggestion.sortText,
						detail: tsSuggestion.kind
					}

					monacoSuggestions.push(monacoSuggestion)
				}

				return { suggestions: monacoSuggestions }
			} catch (error) {
				console.error("Error providing completions:", error)
				return { suggestions: [] }
			}
		}
	})

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
}

export const Playground = () => {
	const [loaded, setLoaded] = useState(false)
	const monaco = useMonaco()
	if (monaco && !loaded) setupMonaco(monaco).then(() => setLoaded(true))
	return loaded ?
			<Editor
				height="30vh"
				defaultLanguage="typescript"
				defaultValue="const foo: 'fook' = "
				theme="arkdark"
				options={{
					minimap: { enabled: false },
					scrollBeyondLastLine: false,
					quickSuggestions: {
						strings: "on"
					},
					quickSuggestionsDelay: 0
				}}
				onMount={editor => {
					const editorElement = editor.getDomNode()

					if (editorElement) {
						editorElement.style.borderRadius = "16px"
						editorElement.style.boxShadow =
							"0 10px 15px 0 rgba(0, 0, 0, 0.3), 0 15px 30px 0 rgba(0, 0, 0, 0.22)"
						editorElement.style.transition =
							"all 0.3s cubic-bezier(.25,.8,.25,1)"
						editorElement.style.backdropFilter = "blur(16px)"
						const guard = editorElement?.querySelector(
							".overflow-guard"
						) as HTMLElement | null
						guard!.style.borderRadius = "16px"
					}
				}}
			/>
		:	"Loading..."
}
