import { throwInternalError, type propwiseXor } from "@ark/util"
import { cx } from "class-variance-authority"
import type { Element } from "hast"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { highlight } from "../lib/content/highlight.ts"
import type { HighlightLang } from "../lib/shiki.ts"
import type { SnippetId } from "../lib/writeSnippetsEntrypoint.ts"
import { CodeFrame, TokensPre } from "./mdx/CodeFrame.tsx"
import snippetContentsById from "./snippets/contentsById.ts"

export type CodeBlockProps = {
	/** @default "ts" */
	lang?: HighlightLang
	title?: string
	style?: React.CSSProperties
	className?: string
	includesCompletions?: boolean
	decorators?: CodeBlockDecorator[]
} & propwiseXor<{ children: string }, { fromFile: SnippetId }>

export type CodeBlockDecorator = "@noErrors"

/** highlights code from a string or a snippet file, for use outside Markdown code fences */
export const CodeBlock = async ({
	lang = "ts",
	title,
	children,
	fromFile,
	style,
	className,
	includesCompletions,
	decorators
}: CodeBlockProps) => {
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

	return (
		<CodeFrame
			title={title}
			className={cx(className, includesCompletions && "completions-block")}
			style={style}
		>
			{await highlightToJsx(src, lang)}
		</CodeFrame>
	)
}

/** highlighted code as a bare `pre`, for frames that hold more than one */
export const highlightToJsx = async (code: string, lang: HighlightLang) =>
	preToJsx(await highlight(code, { lang }))

/** a highlighted `pre` as JSX, its tokens set as HTML */
export const preToJsx = (pre: Element) =>
	toJsxRuntime(pre, { Fragment, jsx, jsxs, components: { pre: TokensPre } })
