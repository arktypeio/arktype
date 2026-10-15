import { evaluate } from "@mdx-js/mdx"
import type { MDXContent } from "mdx/types"
import { createHash } from "node:crypto"
import * as runtime from "react/jsx-runtime"
import remarkGfm from "remark-gfm"
import { remarkExpandComponents } from "./expand.ts"
import {
	remarkHeadings,
	type HeadingsResult,
	type TocEntry
} from "./headings.ts"
import { rehypeHighlight } from "./highlight.ts"

export type CompiledMdx = {
	Content: MDXContent
	toc: TocEntry[]
}

const compiled = new Map<string, Promise<CompiledMdx>>()

/**
 * Compiles a page's MDX body to a component, highlighting its code and
 * collecting its table of contents. Results are memoized by a hash of the
 * body, so a page that is rendered more than once compiles once.
 */
export const compileMdx = (body: string): Promise<CompiledMdx> => {
	const key = createHash("sha256").update(body).digest("hex")
	let result = compiled.get(key)
	if (!result) {
		result = compile(body)
		compiled.set(key, result)
		// a failed compile shouldn't be remembered, so fixing the page fixes it
		result.catch(() => compiled.delete(key))
	}
	return result
}

const compile = async (body: string): Promise<CompiledMdx> => {
	let toc: TocEntry[] = []
	const { default: Content } = await evaluate(body, {
		...runtime,
		development: false,
		remarkPlugins: [
			remarkGfm,
			remarkExpandComponents,
			[
				remarkHeadings,
				{
					onResult: (result: HeadingsResult) => {
						toc = result.toc
					}
				}
			]
		],
		rehypePlugins: [rehypeHighlight]
	})
	return { Content, toc }
}
