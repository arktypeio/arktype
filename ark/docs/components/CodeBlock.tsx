import { throwInternalError, type propwiseXor } from "@ark/util"
import type { HighlightOptions } from "fumadocs-core/highlight"
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import {
	CodeBlock as FumaCodeBlock,
	Pre
} from "fumadocs-ui/components/codeblock"
import { cn } from "fumadocs-ui/utils/cn"
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
	decorators?: CodeBlockDecorator[]
} & propwiseXor<{ children: string }, { fromFile: SnippetId }>

export type CodeBlockDecorator = "@noErrors"

// preload languages for shiki
// https://github.com/fuma-nama/fumadocs/issues/1095
const highlighter = await getSingletonHighlighter({
	langs: shikiConfig.langs,
	themes: [shikiConfig.themes.dark]
})

export const CodeBlock: React.FC<CodeBlockProps> = ({
	lang = "ts",
	children,
	fromFile,
	style,
	className,
	includesCompletions,
	decorators
}) => {
	let src = children ?? snippetContentsById[fromFile!]

	if (!src) {
		throwInternalError(
			fromFile ?
				`Specified snippet '${fromFile}' does not have a corresponding file`
			:	`CodeBlock requires either a fromFile prop or a string child representing its text contents`
		)
	}

	if (decorators)
		for (const d of decorators) if (!src.includes(d)) src = `// ${d}\n${src}`

	const highlighted = highlight(lang, src)

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

const components: HighlightOptions["components"] = {
	// rounded none is for syntax tabs
	pre: ({ className, children, ...props }) => (
		<Pre className={cn(className, "!rounded-none")} {...props}>
			{children}
		</Pre>
	),
	CodeBlock
}

// overriding these custom components allows hovers to render
// correctly in code blocks outside markdown (e.g. on the home page)
Object.assign(components, {
	Popup,
	PopupContent,
	PopupTrigger
})

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
