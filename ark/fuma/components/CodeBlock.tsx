// import betterErrors from "!./snippets/betterErrors.twoslash.ts?raw"
// import clarityAndConcision from "!./snippets/clarityAndConcision.twoslash.js?raw"
// import deepIntrospectability from "!./snippets/deepIntrospectability.twoslash.js?raw"
// import intrinsicOptimization from "!./snippets/intrinsicOptimization.twoslash.js?raw"
// import unparalleledDx from "!./snippets/unparalleledDx.twoslash.js?raw"
import { fromHere, readFile } from "@ark/fs"
import { flatMorph, throwInternalError, type propwiseXor } from "@ark/util"
import type { HighlightOptions } from "fumadocs-core/server"
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { cn } from "fumadocs-ui/components/api"
import {
	CodeBlock as FumaCodeBlock,
	Pre
} from "fumadocs-ui/components/codeblock"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { existsSync } from "node:fs"
import React from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { getSingletonHighlighter } from "shiki"
import { shikiConfig, type BuiltinLang } from "../lib/shiki.ts"

const snippetIds = [
	"betterErrors",
	"clarityAndConcision",
	"deepIntrospectability",
	"intrinsicOptimization",
	"unparalleledDx"
] as const

export type SnippetId = (typeof snippetIds)[number]

const snippetContentsById = flatMorph(snippetIds, (i, id) => {
	const tsPath = fromHere("snippets", `${id}.twoslash.ts`)
	const jsPath = fromHere("snippets", `${id}.twoslash.js`)

	if (existsSync(tsPath)) return [id, readFile(tsPath)]

	if (existsSync(jsPath)) return [id, readFile(jsPath)]

	return throwInternalError(
		`Expected a snippet file at ${tsPath} or ${jsPath} (neither existed).`
	)
})

export type CodeBlockProps = {
	/** @default "ts" */
	lang?: BuiltinLang
	style?: React.CSSProperties
	className?: string
	includesCompletions?: boolean
} & propwiseXor<{ children: string }, { fromFile: SnippetId }>

// preload languages for shiki
// https://github.com/fuma-nama/fumadocs/issues/1095
const highlighter = await getSingletonHighlighter({
	langs: shikiConfig.langs,
	themes: [shikiConfig.themes.dark]
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
	lang = "ts",
	children,
	fromFile,
	style,
	className,
	includesCompletions
}) => {
	children ??= snippetContentsById[fromFile!]

	const highlighted = highlight(lang, children)

	return (
		<FumaCodeBlock
			className={cn(
				className,
				includesCompletions ? "completions-block" : undefined
			)}
			keepBackground
			style={style}
		>
			{highlighted}
		</FumaCodeBlock>
	)
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
			components
		})
	} catch (e) {
		console.error(`Failed to transform the following code:\n${contents}`)
		throw e
	}
}
