import betterErrors from "!./snippets/betterErrors.twoslash.ts?raw"
import clarityAndConcision from "!./snippets/clarityAndConcision.twoslash.js?raw"
import deepIntrospectability from "!./snippets/deepIntrospectability.twoslash.js?raw"
import intrinsicOptimization from "!./snippets/intrinsicOptimization.twoslash.js?raw"
import unparalleledDx from "!./snippets/unparalleledDx.twoslash.js?raw"
import type { propwiseXor } from "@ark/util"
import {
	highlight as shikiHighlight,
	type HighlightOptions
} from "fumadocs-core/server"
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { cn } from "fumadocs-ui/components/api"
import {
	CodeBlock as FumaCodeBlock,
	Pre
} from "fumadocs-ui/components/codeblock"
import { getSingletonHighlighter } from "shiki"
import { shikiConfig } from "../lib/shiki.js"

const snippetContentsById = {
	betterErrors,
	clarityAndConcision,
	deepIntrospectability,
	intrinsicOptimization,
	unparalleledDx
}

export type SnippetId = keyof typeof snippetContentsById

const langs = ["ts", "bash", "jsonc"] as const satisfies string[]

export type BuiltinLang = (typeof langs)[number]

export type CodeBlockProps = {
	/** @default "ts" */
	lang?: BuiltinLang
} & propwiseXor<{ children: string }, { fromFile: SnippetId }>

// preload languages for shiki
// https://github.com/fuma-nama/fumadocs/issues/1095
await getSingletonHighlighter({
	langs
})

const components: HighlightOptions["components"] = {
	// rounded none is for syntax tabs
	pre: ({ className, children, ...props }) => (
		<Pre className={cn(className, "!rounded-none")} {...props}>
			{children}
		</Pre>
	)
}

// overriding these custom components allows hovers to render
// correctly in code blocks outside markdown (e.g. on the home page)
Object.assign(components, {
	Popup,
	PopupContent,
	PopupTrigger
})

export const CodeBlock: React.FC<CodeBlockProps> = async ({
	lang = "ts",
	children,
	fromFile
}) => {
	children ??= snippetContentsById[fromFile!]

	const highlighted = await highlight(lang, children)

	return <FumaCodeBlock keepBackground>{highlighted}</FumaCodeBlock>
}

const highlight = async (lang: BuiltinLang, contents: string) => {
	try {
		return await shikiHighlight(contents, {
			...shikiConfig,
			meta: {
				__raw: "twoslash"
			},
			lang,
			components
		})
	} catch (e) {
		console.error(`Failed to transform the following code:\n${contents}`)
		throw e
	}
}
