import type { Element } from "hast"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import {
	createHighlighter,
	createJavaScriptRegexEngine,
	type Highlighter
} from "shiki"
import { highlight } from "../../lib/content/highlight.ts"
import { arkDarkTheme, arkTypeScript } from "../../lib/shiki.ts"

const render = (pre: Element) => toJsxRuntime(pre, { Fragment, jsx, jsxs })

/** a snippet through the docs' pipeline: ArkDark, twoslash hovers, errors and `^?` results */
export const HomeCode = async ({ code }: { code: string }) =>
	render(await highlight(code))

let plain: Promise<Highlighter> | undefined

/**
 * ArkDark without twoslash, for code shown as an agent wrote it, before it
 * type-checks.
 */
export const PlainCode = async ({ code }: { code: string }) => {
	const shiki = await (plain ??= createHighlighter({
		themes: [arkDarkTheme],
		langs: [arkTypeScript],
		engine: createJavaScriptRegexEngine({ forgiving: true })
	}))
	const root = shiki.codeToHast(code, { lang: "ts", theme: "ArkDark" })
	return render(root.children[0] as Element)
}
