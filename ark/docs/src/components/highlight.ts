import arkdarkColors from "arkdark/color-theme.json"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import { getHighlighter } from "shiki"
import { addCopyButton, twoslash } from "./shiki.config.js"

let highlighter: Awaited<ReturnType<typeof getHighlighter>> | undefined

export type BuiltinLang = "ts" | "bash" | "jsonc"

export type HighlightArgs = {
	code: string
	lang?: BuiltinLang
}

export const arkHighlight = async (args: HighlightArgs) => {
	highlighter ??= await getHighlighter({
		themes: [arkdarkColors],
		langs: [{ ...arktypeTextmate, name: "ts" } as never, "bash", "jsonc"]
	})
	return highlighter.codeToHtml(args.code, {
		lang: args.lang ?? "ts",
		theme: "ArkDark",
		transformers: [twoslash, addCopyButton]
	})
}
