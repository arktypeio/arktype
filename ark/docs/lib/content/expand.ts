import { slug } from "github-slugger"
import type {
	BlockContent,
	Heading,
	Root,
	RootContent,
	Table,
	TableCell
} from "mdast"
import { fromMarkdown } from "mdast-util-from-markdown"
import { gfmFromMarkdown } from "mdast-util-gfm"
import { toString } from "mdast-util-to-string"
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx"
import { gfm } from "micromark-extension-gfm"
import { SKIP, visit } from "unist-util-visit"
import type {
	ApiGroup,
	ParsedJsDocBlock,
	ParsedJsDocPart
} from "../../../repo/jsdocGen.ts"
import { apiDocsByGroup } from "../../components/apiData.ts"
import {
	keywordRowsByTable,
	keywordTableNames,
	type KeywordTableName
} from "../keywords.ts"

const keywordTableByComponent: Record<string, KeywordTableName> = {
	StringKeywordTable: "string",
	NumberKeywordTable: "number",
	GenericKeywordTable: "generic"
}

/**
 * Replaces components whose content is generated with the Markdown they
 * stand for, so their headings get ids, join the table of contents and
 * are indexed for search:
 *
 * - `<ApiTable group="..." />` becomes a row per member, each with a heading
 *   one level below the section it's in
 * - `<AllKeywordTables />` becomes a heading and a table per keyword group,
 *   also one level below the section it's in
 * - keyword tables carry their rows as search entries
 */
export const expandComponents = (tree: Root): void => {
	const apiNames = new Set<string>()
	visit(tree, "mdxJsxFlowElement", node => {
		if (node.name !== "ApiTable") return
		for (const block of apiDocsByGroup[apiGroupOf(node)])
			apiNames.add(block.name)
	})

	let depth = 1
	visit(tree, (node, i, parent) => {
		if (node.type === "heading") depth = node.depth
		if (node.type !== "mdxJsxFlowElement" || !parent || i === undefined) return

		const childDepth = Math.min(depth + 1, 4) as Heading["depth"]
		let replacement: RootContent[] | undefined
		if (node.name === "ApiTable") {
			replacement = [
				element(
					"ApiMembers",
					{},
					apiDocsByGroup[apiGroupOf(node)].map(block =>
						apiMember(block, childDepth, apiNames)
					)
				)
			]
		} else if (node.name === "AllKeywordTables") {
			replacement = keywordTableNames.flatMap(name => [
				{
					type: "heading",
					depth: childDepth,
					children: [{ type: "text", value: name }]
				} satisfies Heading,
				keywordTable(name)
			])
		} else if (node.name && node.name in keywordTableByComponent)
			replacement = [keywordTable(keywordTableByComponent[node.name])]

		if (!replacement) return
		parent.children.splice(i, 1, ...(replacement as never[]))
		return [SKIP, i + replacement.length]
	})
}

/** remark plugin for rendered pages: {@link expandComponents}, then {@link alignTables} */
export const remarkExpandComponents = () => (tree: Root) => {
	expandComponents(tree)
	alignTables(tree)
}

/** about how many characters of code fit across a table at full prose width */
const tableChars = 95
/** a cell and code span's horizontal padding, in characters */
const cellPaddingChars = 7

/**
 * Gives tables on a page that share a header the same column widths, so
 * each column lines up with the one in the table before it. Every column
 * first gets room for its longest word, or in the first column, where code
 * doesn't wrap (prose.css), its longest code span. The rest goes to columns
 * whose cells are longer than that, by the square root of how much longer,
 * so prose gets the most room without starving the rest.
 */
export const alignTables = (tree: Root): void => {
	const tablesByHeader = new Map<string, Table[]>()
	visit(tree, "table", node => {
		const header = node.children[0].children
			.map(cell => toString(cell))
			.join("|")
		tablesByHeader.set(header, [...(tablesByHeader.get(header) ?? []), node])
	})
	for (const tables of tablesByHeader.values()) {
		if (tables.length < 2) continue
		const columns = tables[0].children[0].children.map((_, column) => {
			const cells = tables.flatMap(table =>
				table.children.flatMap(row => row.children[column] ?? [])
			)
			const unbroken = Math.max(
				...cells.map(cell => longestRun(cell, column === 0))
			)
			const longest = Math.max(...cells.map(cell => toString(cell).length))
			return {
				min: unbroken + cellPaddingChars,
				wrapped: Math.sqrt(longest - unbroken)
			}
		})
		const room = Math.max(0, tableChars - sum(columns.map(({ min }) => min)))
		const totalWrapped = sum(columns.map(({ wrapped }) => wrapped))
		const widths = columns.map(
			({ min, wrapped }) =>
				min + (totalWrapped && (room * wrapped) / totalWrapped)
		)
		const total = sum(widths)
		const dataWidths = widths
			.map(width => ((width / total) * 100).toFixed(1))
			.join(" ")
		for (const table of tables)
			table.data = { ...table.data, hProperties: { dataWidths } }
	}
}

const longestRun = (cell: TableCell, codeIsUnbroken: boolean) => {
	let longest = 0
	visit(cell, node => {
		const runs =
			node.type === "inlineCode" && codeIsUnbroken ? [node.value]
			: node.type === "inlineCode" || node.type === "text" ?
				node.value.split(/\s+/)
			:	[]
		for (const run of runs) longest = Math.max(longest, run.length)
	})
	return longest
}

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0)

const apiGroupOf = (node: MdxJsxFlowElement): ApiGroup => {
	const group = node.attributes.find(
		attr => attr.type === "mdxJsxAttribute" && attr.name === "group"
	)?.value
	if (typeof group !== "string" || !(group in apiDocsByGroup)) {
		throw new Error(
			`<ApiTable group="${String(group)}" /> is not a known group`
		)
	}
	return group as ApiGroup
}

const element = (
	name: string,
	attributes: Record<string, string>,
	children: (BlockContent | RootContent)[]
): MdxJsxFlowElement => ({
	type: "mdxJsxFlowElement",
	name,
	attributes: Object.entries(attributes).map(([name, value]) => ({
		type: "mdxJsxAttribute",
		name,
		value
	})),
	children: children as BlockContent[]
})

export const apiMemberId = (name: string): string => slug(name) || name

const apiMember = (
	block: ParsedJsDocBlock,
	depth: Heading["depth"],
	apiNames: ReadonlySet<string>
): MdxJsxFlowElement => {
	const heading: Heading = {
		type: "heading",
		depth,
		children: [{ type: "inlineCode", value: block.name }],
		data: {
			hProperties: {
				id: apiMemberId(block.name),
				dataApiMember: block.name,
				...(block.params && { dataParams: block.params.join(", ") })
			}
		}
	}
	const body = parseMarkdown(jsDocMarkdown(block.summary, apiNames))
	if (block.notes.length) {
		const [list] = parseMarkdown(
			block.notes.map(note => `- ${jsDocMarkdown(note, apiNames)}`).join("\n")
		)
		if (list?.type !== "list" || list.children.length !== block.notes.length)
			throw new Error(`The notes of ${block.name} don't parse as a list`)
		for (const [i, item] of list.children.entries()) {
			const start = block.notes[i][0]
			if (start?.kind === "noteStart" && start.warning)
				labelParagraph(item.children[0], "warning")
		}
		body.push(list)
	}
	if (block.experimental) {
		const [paragraph] = parseMarkdown(
			jsDocMarkdown(block.experimental, apiNames)
		)
		labelParagraph(paragraph, "experimental")
		body.push(paragraph)
	}

	return element(
		"ApiMember",
		{
			name: block.name,
			group: block.group.toLowerCase(),
			...(block.example && { example: "true" })
		},
		[
			heading,
			...body,
			...(block.example ?
				[
					{
						type: "code",
						lang: "ts",
						value: `// @noErrors\n${block.example}`
					} as const
				]
			:	[])
		]
	)
}

const parseMarkdown = (markdown: string): RootContent[] =>
	fromMarkdown(markdown, {
		extensions: [gfm()],
		mdastExtensions: [gfmFromMarkdown()]
	}).children

/**
 * Starts a paragraph with a mono label, which reads "label:" in the
 * Markdown and search text but shows without its colon on the page.
 */
const labelParagraph = (node: RootContent | undefined, label: string) => {
	if (node?.type !== "paragraph")
		throw new Error(`Expected a paragraph to label ${label}`)
	node.children.unshift(
		{
			type: "text",
			value: `${label}:`,
			data: {
				hName: "span",
				hProperties: { className: ["api-label"] },
				hChildren: [{ type: "text", value: label }]
			}
		},
		{ type: "text", value: " " }
	)
}

const siteUrlPattern = /^https:\/\/arktype\.io(?=\/)/

/** the Markdown a JSDoc comment stands for, as it reads in the API docs */
const jsDocMarkdown = (
	parts: readonly ParsedJsDocPart[],
	apiNames: ReadonlySet<string>
): string =>
	parts
		.map(part =>
			part.kind === "link" ?
				`[${part.value}](${part.url.replace(siteUrlPattern, "")})`
			: part.kind === "reference" ?
				apiNames.has(part.value) ?
					`[\`${part.value}\`](#${apiMemberId(part.value)})`
				:	`\`${part.value}\``
			:	part.value
		)
		.join("")

const keywordTable = (name: KeywordTableName): MdxJsxFlowElement => ({
	...element("KeywordTable", { name }, []),
	data: {
		// a group's root row has no id of its own: the heading above it has one
		searchEntries: keywordRowsByTable[name]
			.filter(row => row.alias !== name)
			.map(row => ({
				heading: row.alias,
				id: row.alias,
				text: row.description
			}))
	}
})
