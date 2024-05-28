import arkdarkColors from "arkdark/color-theme.json"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import { getHighlighter } from "shiki"
import { twoslash } from "./shiki.config.js"

let highlighter: Awaited<ReturnType<typeof getHighlighter>> | undefined

export const arkHighlight = async (code: string) => {
	highlighter ??= await getHighlighter({
		themes: [arkdarkColors],
		langs: [{ ...arktypeTextmate, name: "ts" } as never]
	})
	return highlighter.codeToHtml(code, {
		lang: "ts",
		theme: "ArkDark",
		transformers: [twoslash]
	})
}
