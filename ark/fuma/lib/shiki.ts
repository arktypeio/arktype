import { transformerNotationErrorLevel } from "@shikijs/transformers"
import type { RehypeCodeOptions } from "fumadocs-core/mdx-plugins"
import { transformerTwoslash } from "fumadocs-twoslash"
import { createRequire } from "node:module"
import { defaultCompilerOptions } from "twoslash"

/** for some reason a standard import with an attribute like:
 
    import arkDarkTheme from "arkdark/arkdark.json" with { type: "json" }
    
results in an error like:

	Module "file:///home/ssalb/arktype/ark/dark/arkdark.json" needs an import attribute of "type: json"

despite it having the attribute. Using require as a workaround- convert to an import
like the one above if possible in the future without breaking the build.*/

const require = createRequire(import.meta.url)

const arkDarkTheme = require("arkdark/arkdark.json")
const arkTypePackageJson = require("arkdark/package.json")
const arkTypeTmJson = require("arkdark/tsWithArkType.tmLanguage.json")

// Theme adjustments
/** should match the css rule for .bg-fd-secondary\/50 */
arkDarkTheme.colors["editor.background"] = "#0006"

arkDarkTheme.tokenColors.push({
	// this is covered by editorBracketHighlight.foreground1 etc. in VSCode,
	// but it's not available in Shiki so add a replacement
	scope: ["meta.brace"],
	settings: {
		foreground: "#f5cf8f"
	}
})

const twoslashPropertyPrefix = "(property) "
const twoslash = transformerTwoslash({
	explicitTrigger: false,
	langs: ["ts", "js"],
	twoslashOptions: {
		compilerOptions: {
			...defaultCompilerOptions,
			exactOptionalPropertyTypes: true,
			noErrorTruncation: true
		},
		extraFiles: {
			"global.d.ts": `import type * as a from "arktype"

declare global {
	const type: typeof a.type
	namespace type {
		export type cast<t> = {
			[a.inferred]?: t
		}

		export type errors = a.ArkErrors
	}

	type type<t = unknown, $ = {}> = a.Type<t, $>
	const scope: typeof a.scope
}`
		},
		filterNode: node => {
			switch (node.type) {
				case "hover":
					if (node.text.endsWith(", {}>"))
						// omit default scope param from type display
						node.text = node.text.slice(0, -5) + ">"
					if (node.text.startsWith("type")) return true

					// when `noErrorTruncation` is enabled, TS displays the type
					// of an anonymous cyclic type as `any` instead of using
					// `...`, so replace it to clarify the type is accurately inferred
					node.text = node.text.replaceAll(" any", " ...")
					if (node.text.startsWith("const")) {
						// show type with completions populated for known examples
						node.text = node.text.replace(
							"version?: never",
							`version?: number | string`
						)
						node.text = node.text.replace(
							"versions?: never",
							"versions?: (number | string)[]"
						)
						// filter out the type of Type's invocation
						// as opposed to the Type itself
						return !node.text.includes("(data: unknown)")
					}
					if (node.text.startsWith(twoslashPropertyPrefix)) {
						const expression = node.text.slice(twoslashPropertyPrefix.length)
						if (expression.startsWith("RuntimeErrors.summary") && node.docs) {
							// this shows error summary in JSDoc
							// re-add spaces stripped out during processing
							node.docs = node.docs.replaceAll("•", "    •")
							return true
						}
						if (expression === `platform: "android" | "ios"`) {
							// this helps demonstrate narrowing on discrimination
							return true
						}
						return false
					}
					return false
				case "error":
					// adapted from my ErrorLens implementation at
					// https://github.com/usernamehw/vscode-error-lens/blob/d1786ddeedee23d70f5f75b16415a6579b554b59/src/utils/extUtils.ts#L127
					for (const transformation of arkTypePackageJson.contributes
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
					return true
				default:
					return true
			}
		}
	}
})

export const shikiConfig = {
	themes: {
		dark: arkDarkTheme,
		light: arkDarkTheme
	},
	langs: ["json", "bash", { ...arkTypeTmJson, name: "ts" }],
	transformers: [twoslash, transformerNotationErrorLevel()]
} as const satisfies RehypeCodeOptions

export type shikiConfig = typeof shikiConfig

export type BuiltinLang = {
	[i in keyof shikiConfig["langs"]]: extractName<shikiConfig["langs"][i]>
}[number]

type extractName<lang> = lang extends { name: infer name } ? name : lang
