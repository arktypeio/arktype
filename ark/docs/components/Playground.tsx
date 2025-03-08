"use client"

import { fromHere } from "@ark/fs"
import Editor, { useMonaco } from "@monaco-editor/react"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import arkdarkColors from "arkthemes/arkdark.json"
import type * as Monaco from "monaco-editor"
import { wireTmGrammars } from "monaco-editor-textmate"
import { Registry } from "monaco-textmate"
import { loadWASM } from "onigasm"
import React, { useState } from "react"

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

const setupMonaco = async (monaco: typeof Monaco) => {
	// const onigasmWasmPath = new URL(
	// 	fromHere("..", "node_modules", "onigasm", "lib", "onigasm.wasm")
	// ).toString()
	await loadWASM("/onigasm.wasm")
	monaco.editor.defineTheme("arkdark", theme)
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
				defaultValue=""
				theme="arkdark"
				options={{
					minimap: { enabled: false },
					scrollBeyondLastLine: false
				}}
				onMount={(editor, monaco) => {
					// TODO: ?
					monaco
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
