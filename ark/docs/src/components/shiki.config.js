// @ts-check

import { transformerTwoslash } from "@shikijs/twoslash"
import arkdarkColors from "arkdark/color-theme.json"
import arkdarkPackageJson from "arkdark/package.json"
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

export const twoslash = transformerTwoslash({
	langs: ["ts", "js"],
	twoslashOptions: {
		compilerOptions: {
			...defaultCompilerOptions,
			exactOptionalPropertyTypes: true
		},
		filterNode: node => {
			switch (node.type) {
				case "hover":
					if (node.text.startsWith("const")) {
						if (node.text.endsWith(", {}>"))
							// omit default scope param from type display
							node.text = node.text.slice(0, -5) + ">"
						// show type with completions populated for known examples
						node.text = node.text.replace(
							"isAdmin?: never",
							"isAdmin?: boolean | null"
						)
						node.text = node.text.replace(
							"luckyNumbers: never",
							"luckyNumbers: (number | bigint)[]"
						)
						// filter out the type of Type's invocation
						// as opposed to the Type itself
						return !node.text.includes("(data: unknown)")
					}
					if (node.text.startsWith(twoslashPropertyPrefix)) {
						const expression = node.text.slice(twoslashPropertyPrefix.length)
						if (expression.startsWith("ArkErrors.summary")) {
							// cleanup runtime errors for display
							const runtimeErrorSummary = /^ArkErrors\.summary: "(.*)"/.exec(
								expression
							)
							if (runtimeErrorSummary) {
								node.text = runtimeErrorSummary[1].split("\\n").join("\n")
							}
							// this helps demonstrate narrowing on discrimination
							return true
						}
						if (expression === "luckyNumbers: (number | bigint)[]")
							// this helps demonstrate narrowing on discrimination
							return true
						if (expression.endsWith("typeof ArkErrors"))
							// also helps clarify how discrimination works
							return true
						return false
					}
					return false
				case "error":
					// adapted from my ErrorLens implementation at
					// https://github.com/usernamehw/vscode-error-lens/blob/d1786ddeedee23d70f5f75b16415a6579b554b59/src/utils/extUtils.ts#L127
					for (const transformation of arkdarkPackageJson.contributes
						.configurationDefaults["errorLens.replace"]) {
						const regex = new RegExp(transformation.matcher)
						const matchResult = regex.exec(node.text)
						if (matchResult) {
							node.text = transformation.message
							// Replace groups like $0 and $1 with groups from the match
							for (
								let groupIndex = 0;
								groupIndex < matchResult.length;
								groupIndex++
							) {
								node.text = node.text.replace(
									new RegExp(`\\$${groupIndex}`, "gu"),
									matchResult[Number(groupIndex)]
								)
							}
							node.text = `TypeScript: ${node.text}`
						}
					}
				default:
					return true
			}
		}
	}
})

/** @type {import("shiki").ShikiTransformer} */
export const addCopyButton = {
	name: "addCopyButton",
	postprocess(html) {
		return `<div class="code-container">
	${html}
    <button class="copy-button">
        <img class="copy-icon" src= "/src/assets/copy.svg" />
    </button>
</div>`
	}
}

/** @type { import("astro").ShikiConfig } */
export const shikiConfig = {
	theme: arkdarkColors,
	// @ts-expect-error
	langs: [arktypeTextmate],
	transformers: [twoslash, addCopyButton],
	wrap: true
}
