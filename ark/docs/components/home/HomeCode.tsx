import type { Element } from "hast"
import {
	createHighlighter,
	createJavaScriptRegexEngine,
	hastToHtml,
	type Highlighter
} from "shiki"
import { highlight } from "../../lib/content/highlight.ts"
import {
	arkDarkTheme,
	arkLightTheme,
	arkThemes,
	arkTypeScript
} from "../../lib/shiki.ts"
import { preToJsx } from "../CodeBlock.tsx"

/** a snippet through the docs' pipeline: ArkDark, twoslash hovers, errors and `^?` results */
export const HomeCode = async ({ code }: { code: string }) =>
	preToJsx(await highlight(code))

let plain: Promise<Highlighter> | undefined

/**
 * ArkDark without twoslash, for code shown as an agent wrote it, before it
 * type-checks.
 */
export const PlainCode = async ({ code }: { code: string }) => {
	const shiki = await (plain ??= createHighlighter({
		themes: [arkDarkTheme, arkLightTheme],
		langs: [arkTypeScript],
		engine: createJavaScriptRegexEngine({ forgiving: true })
	}))
	const root = shiki.codeToHast(code, { lang: "ts", ...arkThemes })
	const pre = root.children[0] as Element
	pre.properties.tokens = hastToHtml(pre.children)
	pre.children = []
	return preToJsx(pre)
}
