import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { getColors } from "./getColors.js"
import { getTokenColors } from "./getTokenColors.js"

rmSync("./themes", { recursive: true, force: true })
mkdirSync("./themes")

const getContent = (palette: Record<string, string>, useItalics: boolean) => {
    const colors = getColors(palette)
    const tokenColors = getTokenColors(palette, useItalics)
    const content = {
        colors,
        tokenColors
    }
    return JSON.stringify(content, null, 4)
}

const arkDarkPalette = {
    variables: "#fffff0",
    keywordsAndTokens: "#eb9f2e",
    primitives: "#f5cf8f",
    types: "#009eff",
    functions: "#80cff8"
}

const writeTheme = (key: string) => {
    const palette = arkDarkPalette
    const normal = getContent(palette, false)
    writeFileSync(`./themes/${key}.json`, normal)
}

writeTheme("arkDark")
