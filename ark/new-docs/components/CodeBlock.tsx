import type { propwiseXor } from "@ark/util"
import { highlight, type HighlightOptions } from "fumadocs-core/server"
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { cn } from "fumadocs-ui/components/api"
import {
	CodeBlock as FumaCodeBlock,
	Pre
} from "fumadocs-ui/components/codeblock"
import { bundledLanguages, getSingletonHighlighter } from "shiki"
import { shikiConfig } from "../lib/shiki.ts"
import betterErrors from "./snippets/betterErrors.twoslash.ts?raw"
import clarityAndConcision from "./snippets/clarityAndConcision.twoslash.js?raw"
import deepIntrospectability from "./snippets/deepIntrospectability.twoslash.js?raw"
import intrinsicOptimization from "./snippets/intrinsicOptimization.twoslash.js?raw"
import unparalleledDx from "./snippets/unparalleledDx.twoslash.js?raw"

const snippetContentsById = {
	betterErrors,
	clarityAndConcision,
	deepIntrospectability,
	intrinsicOptimization,
	unparalleledDx
}

export type SnippetId = keyof typeof snippetContentsById

export type CodeBlockProps = {
	/** @default "ts" */
	lang?: string
} & propwiseXor<{ contents: string }, { fromFile: SnippetId }>

// preload languages for shiki
// https://github.com/fuma-nama/fumadocs/issues/1095
await getSingletonHighlighter({
	langs: Object.keys(bundledLanguages)
})

export const CodeBlock: React.FC<CodeBlockProps> = async ({
	lang = "ts",
	contents,
	fromFile
}) => {
	contents ??= snippetContentsById[fromFile!]

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

	const rendered = await highlight(contents, {
		...shikiConfig,
		meta: {
			__raw: "twoslash"
		},
		lang,
		components
	})

	return <FumaCodeBlock keepBackground>{rendered}</FumaCodeBlock>
}
