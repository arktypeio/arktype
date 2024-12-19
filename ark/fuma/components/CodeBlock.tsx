import betterErrors from "!./snippets/betterErrors.twoslash.ts?raw"
import clarityAndConcision from "!./snippets/clarityAndConcision.twoslash.js?raw"
import deepIntrospectability from "!./snippets/deepIntrospectability.twoslash.js?raw"
import intrinsicOptimization from "!./snippets/intrinsicOptimization.twoslash.js?raw"
import unparalleledDx from "!./snippets/unparalleledDx.twoslash.js?raw"
import type { propwiseXor } from "@ark/util"
import type { HighlightOptions } from "fumadocs-core/server"
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { cn } from "fumadocs-ui/components/api"
import {
	CodeBlock as FumaCodeBlock,
	Pre
} from "fumadocs-ui/components/codeblock"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import React from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { getSingletonHighlighter } from "shiki"
import { shikiConfig, type BuiltinLang } from "../lib/shiki.ts"

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
	lang?: BuiltinLang
} & propwiseXor<{ children: string }, { fromFile: SnippetId }>

// preload languages for shiki
// https://github.com/fuma-nama/fumadocs/issues/1095
const highlighter = await getSingletonHighlighter({
	langs: shikiConfig.langs
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

export const CodeBlock: React.FC<CodeBlockProps> = ({
	lang = "ark-ts",
	children,
	fromFile
}) => {
	children ??= snippetContentsById[fromFile!]

	const highlighted = highlight(lang, children)

	return <FumaCodeBlock keepBackground>{highlighted}</FumaCodeBlock>
}

const highlight = (lang: BuiltinLang, contents: string) => {
	try {
		const hast = highlighter.codeToHast(contents, {
			...shikiConfig,
			lang
		})

		return toJsxRuntime(hast, {
			Fragment,
			jsx,
			jsxs,
			development: false,
			components
		})
	} catch (e) {
		console.error(`Failed to transform the following code:\n${contents}`)
		throw e
	}
}
