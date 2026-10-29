import type { Paragraph, Root, TableRow } from "mdast"
import { toString } from "mdast-util-to-string"
import { readFileSync } from "node:fs"
import remarkGfm from "remark-gfm"
import remarkMdx from "remark-mdx"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { SKIP, visit } from "unist-util-visit"
import { parseMdx } from "./frontmatter.ts"
import { expandComponents } from "./expand.ts"
import { collectHeadings, type SearchSection } from "./headings.ts"
import type { PageTree } from "./pageTree.ts"

/**
 * The search index served at /search.json. Pages and their sections are
 * stored as parallel arrays to keep the download small; the client builds
 * a MiniSearch index over `entries` when search first opens.
 */
export type SearchIndex = {
	/** one entry per section of the navigation, e.g. "ArkType" */
	sections: string[]
	pages: SearchIndexPage[]
	entries: SearchIndexEntry[]
}

export type SearchIndexPage = {
	url: string
	title: string
	description: string
	/** index into {@link SearchIndex.sections} */
	section: number
}

export type SearchIndexEntry = {
	/** index into {@link SearchIndex.pages} */
	page: number
	heading: string
	/** the heading's id, or "" for the top of the page */
	id: string
	text: string
}

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm)

/** splits an MDX body into search sections without compiling or highlighting it */
export const searchSectionsOf = (body: string): SearchSection[] => {
	const tree = parser.runSync(parser.parse(body)) as Root
	expandComponents(tree)
	visit(tree, "table", (table, i, parent) => {
		const rows = table.children.flatMap(rowAsParagraph)
		parent!.children.splice(i!, 1, ...rows)
		return [SKIP, i! + rows.length]
	})
	return collectHeadings(tree).sections
}

/** a table row as a sentence, so a snippet doesn't run its cells together */
const rowAsParagraph = (row: TableRow): Paragraph[] => {
	const text = row.children
		.map(cell => toString(cell).replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join(" · ")
	if (!text) return []
	const value = /[!.:;?]$/.test(text) ? text : `${text}.`
	return [{ type: "paragraph", children: [{ type: "text", value }] }]
}

/** builds the search index over every page in the navigation */
export const buildSearchIndex = (tree: PageTree): SearchIndex => {
	const index: SearchIndex = { sections: [], pages: [], entries: [] }
	for (const section of tree.sections) {
		const sectionIndex = index.sections.push(section.title) - 1
		for (const page of section.pages) {
			const pageIndex =
				index.pages.push({
					url: page.url,
					title: page.frontmatter.title,
					description: page.frontmatter.description,
					section: sectionIndex
				}) - 1
			const { body } = parseMdx(readFileSync(page.path, "utf8"))
			for (const { heading, id, text } of searchSectionsOf(body))
				index.entries.push({ page: pageIndex, heading, id, text })
		}
	}
	return index
}
