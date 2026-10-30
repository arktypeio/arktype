import { createRequire } from "node:module"
import type { LanguageRegistration, ThemeRegistration } from "shiki"
import type { TwoslashOptions } from "twoslash"
import { withArkLightContrast } from "./arkLight.ts"

/** for some reason a standard import with an attribute like:

	import arkDarkTheme from "arkdark/arkdark.json" with { type: "json" }

results in an error like:

	Module "file:///home/ssalb/arktype/ark/dark/arkdark.json" needs an import attribute of "type: json"

despite it having the attribute. Using require as a workaround- convert to an import
like the one above if possible in the future without breaking the build.*/

const require = createRequire(import.meta.url)

const arkTypePackageJson = require("arkdark/package.json")
const arkTypeTmJson = require("arkdark/tsWithArkType.tmLanguage.json")

/** VS Code colors braces with editorBracketHighlight, which Shiki doesn't read */
const withBraces = (theme: ThemeRegistration, color: string) => {
	theme.tokenColors!.push({
		scope: ["meta.brace"],
		settings: { foreground: color }
	})
	return theme
}

export const arkDarkTheme: ThemeRegistration = withBraces(
	structuredClone(require("arkthemes/arkdark.json")),
	"#f5cf8f"
)

/** should match --code-bg in app/styles/tokens.css */
arkDarkTheme.colors!["editor.background"] = "#060c18"

export const arkLightTheme: ThemeRegistration = withBraces(
	withArkLightContrast(structuredClone(require("arkthemes/arklight.json"))),
	"#844c13"
)

/** should match --code-bg under ArkLight in app/styles/tokens.css */
arkLightTheme.colors!["editor.background"] = "#fdfbec"

/** both themes, ArkDark inline and ArkLight in --shiki-light (app/styles/code.css) */
export const arkThemes = {
	themes: { dark: "ArkDark", light: "ArkLight" },
	defaultColor: "dark"
} as const

/** TypeScript with ArkType's grammar, which highlights inside definition strings */
export const arkTypeScript: LanguageRegistration = {
	...arkTypeTmJson,
	name: "ts",
	aliases: ["typescript"]
}

export const highlightLangs = ["ts", "js", "tsx", "json", "bash"] as const

export type HighlightLang = (typeof highlightLangs)[number]

export const twoslashLangs: readonly string[] = ["ts", "js"]

const twoslashPropertyPrefix = "(property) "

export const twoslashOptions: TwoslashOptions = {
	compilerOptions: {
		// avoid ... in certain longer types on hover
		noErrorTruncation: true,
		// matches the tsconfig /docs/intro/setup recommends
		exactOptionalPropertyTypes: true,
		// twoslash defaults to baseUrl and node10 resolution, which TS 6 deprecates
		ignoreDeprecations: "6.0",
		// snippets import "./config.ts" for its side effects without defining it
		noUncheckedSideEffectImports: false
	},
	extraFiles: {
		"global.d.ts": `import type * as a from "arktype"
import type * as r from "arkregex"

declare global {
	const regex: typeof r.regex
	const type: typeof a.type
	namespace type {
		export type cast<t> = {
			[a.inferred]?: t
		}

		export type errors = a.ArkErrors

		export type validate<def, $ = {}, args = a.bindThis<def>> = a.validateDefinition<
			def,
			$,
			args
		>

		export type instantiate<def, $ = {}, args = a.bindThis<def>> = type<
			a.inferDefinition<def, $, args>,
			$
		>

		export type infer<def, $ = {}, args = a.bindThis<def>> = a.inferDefinition<
			def,
			$,
			args
		>

		/** @ts-ignore cast variance */
		export interface Any<out t = any, $ = any> extends a.BaseType<t, $> {}
	}

	type type<t = unknown, $ = {}> = a.Type<t, $>
	const scope: typeof a.scope
	const match: typeof a.match
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
				node.text = node.text.replace(/ any/g, " ...")
				if (node.text.startsWith("const")) {
					// show type with completions populated for known examples
					node.text = node.text.replace(
						"version?: undefined",
						`version?: number | string`
					)
					node.text = node.text.replace(
						"versions?: undefined",
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
						node.docs = node.docs.replace(/•/g, "    •")
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
