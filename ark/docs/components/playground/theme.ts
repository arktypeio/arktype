import arkdarkColors from "arkthemes/arkdark.json" with { type: "json" }
import type * as Monaco from "monaco-editor"

export interface VSCodeTheme {
	colors: {
		[name: string]: string
	}
	tokenColors: TokenColor[]
}

export interface TokenColor {
	scope: string | string[]
	settings: {
		foreground?: string
		background?: string
		fontStyle?: string
	}
}

export const vsCodeThemeToMonaco = (
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
