/**
 * ArkLight's lighter accents are under 4.5:1 on the docs' parchment, so each
 * is darkened along its own hue until it clears that on --bg, --code-bg and
 * the tinted bands laid over them (^? results, error lines), as
 * ssalbdivad.com does. Keys are lowercase.
 */
const arkLightContrast: Record<string, string> = {
	"#ca842e": "#925514",
	"#04b5a3": "#036c61",
	"#0078d4": "#0063b1",
	"#888899": "#5e5e70",
	"#9558f8": "#6d35d6"
}

type ThemeColors = {
	tokenColors?: { settings: { foreground?: string } }[]
}

/** ArkLight with its accents darkened to AA, in place */
export const withArkLightContrast = <theme extends ThemeColors>(
	theme: theme
): theme => {
	for (const { settings } of theme.tokenColors ?? []) {
		const foreground = settings.foreground?.toLowerCase()
		if (foreground && foreground in arkLightContrast)
			settings.foreground = arkLightContrast[foreground]
	}
	return theme
}
