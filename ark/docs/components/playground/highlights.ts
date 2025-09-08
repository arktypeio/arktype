import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json" with { type: "json" }
import arkdarkColors from "arkthemes/arkdark.json" with { type: "json" }
import type * as Monaco from "monaco-editor"
import { wireTmGrammars } from "monaco-editor-textmate"
import { Registry } from "monaco-textmate"

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

export const theme = vsCodeThemeToMonaco(arkdarkColors)

export const setupTextmateGrammar = async (monaco: typeof Monaco) =>
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
