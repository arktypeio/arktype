import GithubSlugger from "github-slugger"
import type { Heading, Nodes, Root } from "mdast"
import { toString } from "mdast-util-to-string"
import { SKIP, visit } from "unist-util-visit"

export type TocEntry = {
	depth: number
	title: string
	id: string
}

/** a stretch of a page under one heading, the unit search results point to */
export type SearchSection = {
	/**
	 * the heading's text, or "" for the text before a page's first heading.
	 * Below depth 2, it's prefixed by its parent's, like "Union · n-ary".
	 */
	heading: string
	/** the heading's id, or "" for the top of the page */
	id: string
	text: string
}

declare module "mdast" {
	interface Data {
		/** sections to index for search beside this node, e.g. table rows */
		searchEntries?: SearchSection[]
	}
}

export type HeadingsResult = {
	toc: TocEntry[]
	sections: SearchSection[]
}

const customIdPattern = /\s*\[#([^\s\]]+)]\s*$/

const tocDepths = new Set([2, 3])

/**
 * Assigns each heading an id, collects the table of contents and splits the
 * page into search sections.
 *
 * Ids are github-slugger slugs of the heading's text, deduplicated by suffix.
 * A heading ending in `[#custom-id]` gets that id instead and the marker is
 * removed, as does a heading whose id another plugin already set.
 */
export const collectHeadings = (tree: Root): HeadingsResult => {
	const slugger = new GithubSlugger()
	const used = new Set<string>()
	const toc: TocEntry[] = []
	const sections: SearchSection[] = [{ heading: "", id: "", text: "" }]
	const titlesByDepth: string[] = []

	const appendText = (text: string) => {
		const current = sections.at(-1)!
		current.text = current.text ? `${current.text} ${text}` : text
	}

	// reserve every explicit id first, so a generated slug never takes one
	visit(tree, "heading", node => {
		const explicit = explicitIdOf(node)
		if (explicit) used.add(explicit)
	})

	const uniqueSlug = (text: string) => {
		let id = slugger.slug(text)
		while (used.has(id)) id = slugger.slug(text)
		return id
	}

	visit(tree, (node: Nodes) => {
		if (node.type === "heading") {
			const id = assignId(node, uniqueSlug, used)
			const title = toString(node).trim()
			if (tocDepths.has(node.depth)) toc.push({ depth: node.depth, title, id })
			const parent = titlesByDepth.slice(2, node.depth).findLast(Boolean)
			titlesByDepth.length = node.depth
			titlesByDepth[node.depth] = title
			sections.push({
				heading: parent ? `${parent} · ${title}` : title,
				id,
				text: ""
			})
			return SKIP
		}
		if (node.data?.searchEntries)
			sections.push(...node.data.searchEntries.map(entry => ({ ...entry })))
		if (node.type === "code") return SKIP
		if (
			node.type === "paragraph" ||
			node.type === "tableCell" ||
			node.type === "text" ||
			node.type === "inlineCode"
		) {
			const text = toString(node).replace(/\s+/g, " ").trim()
			if (text) appendText(text)
			return SKIP
		}
	})

	return {
		toc,
		sections: sections.filter(
			section => section.id || section.text || section.heading
		)
	}
}

const explicitIdOf = (node: Heading): string | undefined => {
	const existing = node.data?.hProperties?.id
	if (typeof existing === "string") return existing
	const last = node.children.at(-1)
	if (last?.type === "text") return customIdPattern.exec(last.value)?.[1]
}

const assignId = (
	node: Heading,
	uniqueSlug: (text: string) => string,
	used: Set<string>
): string => {
	const explicit = explicitIdOf(node)

	const last = node.children.at(-1)
	if (last?.type === "text") {
		const custom = customIdPattern.exec(last.value)
		if (custom) {
			last.value = last.value.slice(0, custom.index)
			if (!last.value) node.children.pop()
		}
	}

	const id = explicit ?? uniqueSlug(toString(node).trim())
	used.add(id)
	node.data ??= {}
	node.data.hProperties = { ...node.data.hProperties, id }
	return id
}

/** remark plugin form of {@link collectHeadings}, passing its result to `onResult` */
export const remarkHeadings =
	(options: { onResult: (result: HeadingsResult) => void }) =>
	(tree: Root): undefined => {
		options.onResult(collectHeadings(tree))
	}
