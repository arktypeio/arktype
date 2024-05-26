// @ts-check

import { transformerTwoslash } from "@shikijs/twoslash"
import arkdarkColors from "arkdark/color-theme.json"
import arktypeTextmate from "arkdark/tsWithArkType.tmLanguage.json"
import { defaultCompilerOptions } from "twoslash"

// Theme adjustments

arkdarkColors.colors["editor.background"] = "#00000027"
// @ts-expect-error
arkdarkColors.tokenColors.push({
	// this is covered by editorBracketHighlight.foreground1 etc. in VSCode,
	// but it's not available in Shiki so add a replacement
	scope: ["meta.brace"],
	settings: {
		foreground: "#f5cf8f"
	}
})

const twoslashPropertyPrefix = "(property) "

const twoslash = transformerTwoslash({
	twoslashOptions: {
		compilerOptions: {
			...defaultCompilerOptions,
			exactOptionalPropertyTypes: true
		},
		filterNode: node => {
			if (node.type !== "hover") return true
			if (node.text.startsWith("const")) {
				// filter out the type of Type's invocation
				// as opposed to the Type itself
				return !node.text.includes("(data: unknown)")
			}
			if (node.text.startsWith(twoslashPropertyPrefix)) {
				const expression = node.text.slice(twoslashPropertyPrefix.length)
				if (expression.startsWith("ArkErrors.summary"))
					// this helps demonstrate narrowing on discrimination
					return true
				if (expression.endsWith("typeof ArkErrors"))
					// also helps clarify how discrimination works
					return true
				return false
			}
			return false
		}
	}
})

/** @type { import("astro").ShikiConfig } */
export const shikiConfig = {
	theme: arkdarkColors,
	// @ts-expect-error
	langs: [arktypeTextmate],
	transformers: [twoslash]
}
