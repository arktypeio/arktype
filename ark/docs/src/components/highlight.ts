import { transformerNotationErrorLevel } from "@shikijs/transformers"
import arkdarkColors from "arkdark/arkdark.json"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import { createHighlighter } from "shiki"
import { addCopyButton, twoslash } from "./shiki.config.js"

let highlighter: Awaited<ReturnType<typeof createHighlighter>> | undefined

export type BuiltinLang = "ts" | "bash" | "jsonc"

export type HighlightArgs = {
	code: string
	lang?: BuiltinLang
}

export const arkHighlight = async (args: HighlightArgs) => {
	highlighter ??= await createHighlighter({
		themes: [arkdarkColors],
		langs: [{ ...arktypeTextmate, name: "ts" } as never, "bash", "jsonc"]
	})
	return highlighter.codeToHtml(args.code, {
		lang: args.lang ?? "ts",
		theme: "ArkDark",
		transformers: [
			twoslash,
			transformerNotationErrorLevel() as never,
			addCopyButton
		]
	})
}
