import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json" with { type: "json" }
import arkdarkColors from "arkthemes/arkdark.json" with { type: "json" }
import arklightColors from "arkthemes/arklight.json" with { type: "json" }
import type * as Monaco from "monaco-editor"
import { wireTmGrammars } from "monaco-editor-textmate"
import { Registry } from "monaco-textmate"
import { withArkLightContrast } from "../../lib/arkLight.ts"

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
	theme: VSCodeTheme,
	base: Monaco.editor.BuiltinTheme
): Monaco.editor.IStandaloneThemeData => ({
	base,
	inherit: false,
	colors: theme.colors,
	rules: theme.tokenColors.flatMap(c =>
		Array.isArray(c.scope) ?
			c.scope.map(token => ({ token, ...c.settings }))
		:	[{ token: c.scope, ...c.settings }]
	)
})

/** Monaco's themes, by name */
export const editorThemes = {
	arkdark: vsCodeThemeToMonaco(
		{
			...arkdarkColors,
			// the themes' line numbers are 4.2:1, under AA
			colors: {
				...arkdarkColors.colors,
				"editorLineNumber.foreground": "#888899"
			}
		},
		"vs-dark"
	),
	arklight: vsCodeThemeToMonaco(
		withArkLightContrast({
			...arklightColors,
			// nested brackets: the deeper two were under 3:1 on parchment
			colors: {
				...arklightColors.colors,
				"editorLineNumber.foreground": "#5e5e70",
				"editorBracketHighlight.foreground2": "#925514",
				"editorBracketHighlight.foreground3": "#a6560c",
				"editorBracketHighlight.unexpectedBracket.foreground": "#925514"
			},
			tokenColors: structuredClone(arklightColors.tokenColors)
		}),
		"vs"
	)
}

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
