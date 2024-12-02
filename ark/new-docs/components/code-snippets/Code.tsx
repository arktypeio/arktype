import { promises as fs } from "fs"
import { highlight, type HighlightOptions } from "fumadocs-core/server"
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui"
import { cn } from "fumadocs-ui/components/api"
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"
import { bundledLanguages, getSingletonHighlighter } from "shiki"
import { shikiConfig } from "../../lib/shiki.ts"

export const CodeSnippet: React.FC<{
	filename: string
	/** @default "ts" */
	lang?: string
}> = async ({ filename, lang = "ts" }) => {
	const codeText = await fs.readFile(
		process.cwd() + "/components/code-snippets/snippets/" + filename,
		"utf8"
	)

	return <HighlightedCode lang={lang} code={codeText} />
}

export const HighlightedCode: React.FC<{
	/** @default "ts" */
	lang?: string
	code: string
}> = async ({ lang = "ts", code }) => {
	// preload languages for shiki
	// https://github.com/fuma-nama/fumadocs/issues/1095
	await getSingletonHighlighter({
		langs: Object.keys(bundledLanguages)
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

	const rendered = await highlight(code, {
		...shikiConfig,
		meta: {
			__raw: "twoslash"
		},
		lang,
		components
	})

	return <CodeBlock keepBackground>{rendered}</CodeBlock>
}
