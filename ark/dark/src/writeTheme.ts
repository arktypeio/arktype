import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { getColors } from "./getColors.js"
import { getTokenColors } from "./getTokenColors.js"

rmSync("./themes", { recursive: true, force: true })
mkdirSync("./themes")

const getContent = (palette: ArkDarkPalette, useItalics: boolean) => {
	const colors = getColors(palette)
	const tokenColors = getTokenColors(palette, useItalics)
	const content = {
		colors,
		tokenColors
	}
	return JSON.stringify(content, null, 4)
}

const arkDarkPalette = {
	variables: "#f5cf8f",
	keywordsAndTokens: "#eb9f2e",
	primitives: "#408fde",
	types: "#40decc",
	functions: "#80cff8",
	errors: "#9558f8"
}

export type ArkDarkPalette = typeof arkDarkPalette

const writeTheme = (key: string) => {
	const palette = arkDarkPalette
	const normal = getContent(palette, false)
	writeFileSync(`./themes/${key}.json`, normal)
}

writeTheme("arkDark")
