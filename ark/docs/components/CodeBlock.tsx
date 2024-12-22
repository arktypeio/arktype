import type { propwiseXor } from "@ark/util"
import type { HighlightOptions } from "fumadocs-core/server"
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { cn } from "fumadocs-ui/components/api"
import {
	CodeBlock as FumaCodeBlock,
	Pre
} from "fumadocs-ui/components/codeblock"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { getSingletonHighlighter } from "shiki"
import { shikiConfig, type BuiltinLang } from "../lib/shiki.ts"
import type { SnippetId } from "../lib/writeSnippetsEntrypoint.ts"
import snippetContentsById from "./snippets/contentsById.ts"

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
