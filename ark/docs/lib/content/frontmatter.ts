import { type } from "arktype"
import type { Root } from "mdast"
import remarkGfm from "remark-gfm"
import remarkMdx from "remark-mdx"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { parse } from "yaml"

export const Frontmatter = type({
	"+": "reject",
	title: "string > 0",
	description: "string > 0",
	"toc?": "boolean",
	"icon?": "'New' | 'Advanced'",
	/** when a blog post was announced, as YYYY-MM-DD */
	"date?": /^\d{4}-\d{2}-\d{2}$/,
	/** the page's social card, under public/image, in place of ogDocs.png */
	"ogImage?": "string > 0"
})

export type Frontmatter = typeof Frontmatter.infer

export type PageIcon = NonNullable<Frontmatter["icon"]>

export type ParsedMdx = {
	frontmatter: Frontmatter
	body: string
	/** why the frontmatter is invalid, if it is */
	problem?: string
}

const frontmatterPattern = /^---\r?\n([\S\s]*?)\r?\n---(?:\r?\n|$)/

/**
 * Splits an .mdx source into its frontmatter and body.
 *
 * Invalid frontmatter is reported as `problem` alongside a best-effort
 * fallback, so the caller decides whether it fails the build.
 */
export const parseMdx = (source: string): ParsedMdx => {
	const match = frontmatterPattern.exec(source)
	const body = match ? source.slice(match[0].length) : source
	const data: unknown = match ? (parse(match[1]) ?? {}) : {}
	const frontmatter = Frontmatter(data)
	if (!(frontmatter instanceof type.errors)) return { frontmatter, body }

	const record = (typeof data === "object" ? data : {}) as Record<
		string,
		unknown
	>
	return {
		frontmatter: {
			title: typeof record.title === "string" ? record.title : "",
			description:
				typeof record.description === "string" ? record.description : ""
		},
		body,
		problem: frontmatter.summary
	}
}

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm)

/** an MDX body's syntax tree, with GFM tables and its JSX */
export const parseMdxTree = (body: string): Root =>
	parser.runSync(parser.parse(body)) as Root
