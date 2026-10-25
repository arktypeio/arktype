import type {
	Code,
	List,
	ListItem,
	Nodes,
	Paragraph,
	Parent,
	PhrasingContent,
	Root,
	RootContent,
	Table
} from "mdast"
import { gfmToMarkdown } from "mdast-util-gfm"
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx"
import { toMarkdown } from "mdast-util-to-markdown"
import remarkGfm from "remark-gfm"
import remarkMdx from "remark-mdx"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { installCommand } from "../../components/installCommand.ts"
import { benchNotes, benchTable, harness } from "../bench/bench.ts"
import snippetContentsById from "../../components/snippets/contentsById.ts"
import {
	claims,
	draftOf,
	headlineMethod,
	isPending,
	sizeChart,
	speedChart,
	type BenchmarkChart,
	type Claim,
	type ClaimId
} from "../claims.ts"
import { keywordRowsByTable, type KeywordTableName } from "../keywords.ts"
import { twoslashLangs, twoslashOptions } from "../shiki.ts"
import { expandComponents } from "./expand.ts"
import type { Frontmatter } from "./frontmatter.ts"
import { collectHeadings } from "./headings.ts"
import { twoslasher } from "./twoslash.ts"

export const siteUrl = "https://arktype.io"

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm)

/**
 * A page as Markdown that reads like the rendered page: components become
 * the Markdown they stand for, twoslash directives are removed and each
 * `// ^?` result and `// @errors` diagnostic is written in as a comment.
 */
export const mdxToMarkdown = (
	frontmatter: Frontmatter,
	body: string
): string => {
	const tree = parser.runSync(parser.parse(body)) as Root
	expandComponents(tree)
	// strips [#custom-id] from headings
	collectHeadings(tree)
	transform(tree)
	const markdown = toMarkdown(tree, {
		bullet: "-",
		emphasis: "_",
		fences: true,
		listItemIndent: "one",
		rule: "-",
		// unpadded cells keep generated tables small
		extensions: [gfmToMarkdown({ tablePipeAlign: false })]
	})
	return `# ${frontmatter.title}\n\n> ${frontmatter.description}\n\n${markdown.trim()}\n`
}

type Jsx = MdxJsxFlowElement | MdxJsxTextElement

const warned = new Set<string>()

const transform = (tree: Root) => {
	visit(tree, (node, i, parent) => {
		if (!parent || i === undefined) return
		if (node.type === "link" && node.url.startsWith("/"))
			node.url = siteUrl + node.url
		if (node.type === "code") {
			node.value = codeForMarkdown(node)
			delete node.meta
			return
		}
		let replacement: RootContent[] | undefined
		if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement")
			replacement = jsxToMarkdown(node)
		else if (
			node.type === "mdxFlowExpression" ||
			node.type === "mdxTextExpression" ||
			node.type === "mdxjsEsm"
		)
			replacement = []
		if (!replacement) return
		parent.children.splice(i, 1, ...(replacement as never[]))
		// revisit the replacement, which may hold more components
		return i
	})
	visit(tree, mergeAdjacentLinkLists)
}

const attr = (node: Jsx, name: string): string | undefined => {
	const found = node.attributes.find(
		attribute => attribute.type === "mdxJsxAttribute" && attribute.name === name
	)
	if (!found || found.type !== "mdxJsxAttribute") return
	if (found.value === null || found.value === undefined) return "true"
	if (typeof found.value === "string") return found.value
	// an expression like rows={[...]}, which content only uses for literals
	return JSON.stringify(new Function(`return (${found.value.value})`)())
}

const jsonAttr = <t>(node: Jsx, name: string): t | undefined => {
	const value = attr(node, name)
	return value === undefined ? undefined : JSON.parse(value)
}

/** text with each URL in it as a link, which Markdown writes unescaped */
const phrasing = (text: string): PhrasingContent[] =>
	text
		.split(/(https?:\/\/[^\s)]*[^\s),.:;])/)
		.filter(Boolean)
		.map(part =>
			/^https?:\/\//.test(part) ?
				{ type: "link", url: part, children: [{ type: "text", value: part }] }
			:	{ type: "text", value: part }
		)

const paragraph = (text: string, strong = false): Paragraph => ({
	type: "paragraph",
	children:
		strong ? [{ type: "strong", children: phrasing(text) }] : phrasing(text)
})

const linkItem = (title: string, href: string, description?: string): List => ({
	type: "list",
	ordered: false,
	spread: false,
	data: { linkList: true } as never,
	children: [
		{
			type: "listItem",
			spread: false,
			children: [
				{
					type: "paragraph",
					children: [
						{
							type: "link",
							url: href.startsWith("/") ? siteUrl + href : href,
							children: [{ type: "text", value: title }]
						},
						...(description ?
							[{ type: "text" as const, value: `: ${description}` }]
						:	[])
					]
				}
			]
		}
	]
})

const table = (header: string[], rows: (string | RootContent)[][]): Table => ({
	type: "table",
	align: header.map(() => null),
	children: [header, ...rows].map(cells => ({
		type: "tableRow",
		children: cells.map(cell => ({
			type: "tableCell",
			children: [
				...(typeof cell === "string" ? phrasing(cell) : [cell as never])
			]
		}))
	}))
})

const claimMarkdown = (claim: Claim<string>) =>
	`${draftOf(claim)}${isPending(claim) ? " (pending)" : ""}`

/** a chart's caption, then its bars as a list */
const claimChartMarkdown = (chart: BenchmarkChart): RootContent[] => [
	{
		type: "paragraph",
		children: [
			{ type: "strong", children: [{ type: "text", value: chart.title }] },
			{
				type: "text",
				value: ` (${chart.unit}, lower is better): ${claimMarkdown(chart.detail).replace(/\.$/, "")}. Source: `
			},
			{
				type: "link",
				url: chart.source.href,
				children: [{ type: "text", value: chart.source.label }]
			}
		]
	},
	{
		type: "list",
		ordered: false,
		spread: false,
		children: chart.bars.map(bar => ({
			type: "listItem",
			spread: false,
			children: [
				paragraph(
					`${bar.name}: ${bar.value === null ? "pending" : bar.value.toLocaleString("en-US")}`
				)
			]
		}))
	}
]

const calloutLabels: Record<string, string> = {
	info: "Note",
	warn: "Warning",
	error: "Error",
	tip: "Tip"
}

const jsxToMarkdown = (node: Jsx): RootContent[] => {
	const children = node.children as RootContent[]
	switch (node.name) {
		case "Callout":
			return [
				{
					type: "blockquote",
					children: [
						paragraph(
							attr(node, "title") ??
								calloutLabels[attr(node, "type") ?? "info"],
							true
						),
						...(children as never[])
					]
				}
			]
		case "SyntaxTab": {
			const kind = node.attributes.find(
				attribute => attribute.type === "mdxJsxAttribute"
			)
			return [
				paragraph(kind?.type === "mdxJsxAttribute" ? kind.name : "", true),
				...children
			]
		}
		case "Tabs":
			return tabsToMarkdown(node)
		case "InstallationTabs":
			return [
				{
					type: "code",
					lang: "bash",
					value: installCommand("npm", {
						pkg: attr(node, "pkg"),
						dev: attr(node, "dev") === "true"
					})
				}
			]
		case "CodeBlock": {
			const fromFile = attr(
				node,
				"fromFile"
			) as keyof typeof snippetContentsById
			const code: Code = {
				type: "code",
				lang: attr(node, "lang") ?? "ts",
				value: fromFile ? snippetContentsById[fromFile] : toPlainText(node)
			}
			code.value = codeForMarkdown(code)
			return [code]
		}
		case "LinkCard":
		case "Card": {
			const href = attr(node, "href")
			const title = attr(node, "title") ?? ""
			if (!href) return [paragraph(title, true), ...children]
			return [linkItem(title, href, attr(node, "description"))]
		}
		case "KeywordTable": {
			const name = attr(node, "name") as KeywordTableName
			return [
				table(
					["Alias", "Description"],
					keywordRowsByTable[name].map(({ alias, description }) => [
						{ type: "inlineCode", value: alias },
						description
					])
				)
			]
		}
		case "BenchmarkChart": {
			const bench = benchTable()
			return [
				table(
					bench.head,
					bench.rows.map(row => [
						row.firstError ?
							`${row.scenario} (first-error build)`
						:	row.scenario,
						...row.cells,
						row.fastestOther,
						row.versus
					])
				),
				...benchNotes().map(note => paragraph(note)),
				{
					type: "paragraph",
					children: [
						{ type: "text", value: harness.lead },
						{
							type: "link",
							url: harness.url,
							children: [{ type: "text", value: harness.link }]
						},
						{ type: "text", value: "." }
					]
				} satisfies Paragraph
			]
		}
		case "Claim": {
			const text = claimMarkdown(claims[attr(node, "id") as ClaimId])
			return node.type === "mdxJsxTextElement" ?
					[{ type: "text", value: text }]
				:	[paragraph(text)]
		}
		case "Headline": {
			const text = claimMarkdown(claims.headline)
			return node.type === "mdxJsxTextElement" ?
					[{ type: "text", value: text }]
				:	[paragraph(text)]
		}
		case "HeadlineNote":
			return [
				{
					type: "paragraph",
					children: [
						{ type: "text", value: `${claimMarkdown(claims.headlineNote)} ` },
						{
							type: "link",
							url: headlineMethod.href,
							children: [{ type: "text", value: headlineMethod.label }]
						}
					]
				} satisfies Paragraph
			]
		case "ClaimCharts":
			return [
				...[speedChart, sizeChart].flatMap(claimChartMarkdown),
				paragraph(
					`${claimMarkdown(claims.chartsSummary)} Each chart names its benchmark and the options ArkType was built with.`
				)
			]
		case "summary":
			return [paragraph(toPlainText(node).trim(), true)]
		case "video": {
			const src = attr(node, "src")
			return src ? [linkItem("Video", src)] : []
		}
		// purely visual or navigational, nothing to carry over
		case "AnchorAliases":
		case "MainAutoplayDemo":
		case "RuntimeBenchmarksGraph":
			return []
		// containers whose content reads fine on its own
		case "ApiMembers":
		case "ApiMember":
		case "Cards":
		case "Steps":
		case "Step":
		case "SyntaxTabs":
			return children
		default:
			// other HTML elements, e.g. <details>, read fine as their content
			if (node.name && /^[A-Z]/.test(node.name) && !warned.has(node.name)) {
				warned.add(node.name)
				console.warn(
					`writeMarkdown: <${node.name}> has no Markdown form, so only its children were kept`
				)
			}
			return children
	}
}

const tabsToMarkdown = (node: Jsx): RootContent[] => {
	const items = jsonAttr<string[]>(node, "items") ?? []
	let i = 0
	return (node.children as RootContent[]).flatMap(child => {
		if (child.type !== "mdxJsxFlowElement" || child.name !== "Tab")
			return [child]
		const label = attr(child, "value") ?? items[i]
		i++
		return [
			...(label ? [paragraph(label, true)] : []),
			...(child.children as RootContent[])
		]
	})
}

const toPlainText = (node: Nodes): string =>
	"value" in node ? node.value
	: "children" in node ? node.children.map(toPlainText).join("")
	: ""

/** consecutive link cards become one list rather than lists separated by comments */
const mergeAdjacentLinkLists = (node: Nodes) => {
	if (!("children" in node)) return
	const parent = node as Parent
	for (let i = parent.children.length - 1; i > 0; i--) {
		const current = parent.children[i]
		const previous = parent.children[i - 1]
		if (
			current.type === "list" &&
			previous.type === "list" &&
			(current.data as { linkList?: boolean })?.linkList &&
			(previous.data as { linkList?: boolean })?.linkList
		) {
			previous.children.push(...(current.children as ListItem[]))
			parent.children.splice(i, 1)
		}
	}
}

/**
 * A code block as it reads on the page, with each `// ^?` query's result and
 * each `// @errors` diagnostic written in as a comment under its line, unless
 * the snippet already describes that error in a comment.
 */
export const codeForMarkdown = (code: Code): string => {
	const lang = code.lang ?? ""
	if (!twoslashLangs.includes(lang)) return code.value
	if (!/^\s*\/\/\s*(\^\?|@errors)/m.test(code.value))
		return stripTwoslash(code.value)

	let result: ReturnType<typeof twoslasher>
	try {
		result = twoslasher(code.value, lang, twoslashOptions)
	} catch (e) {
		// as on the page, a failing snippet only fails a production build
		if (process.env.NODE_ENV === "production") throw e
		return stripTwoslash(code.value)
	}
	const lines = result.code.split("\n")
	const commentsByLine = new Map<number, string[]>()
	for (const node of result.nodes) {
		if (node.type !== "query" && node.type !== "error") continue
		if (node.type === "error" && hasErrorComment(lines, node.line)) continue
		const text =
			node.type === "query" ?
				node.text
			:	`TypeScript: ${node.text.replace(/^TypeScript:\s*/, "")}`
		const comments = commentsByLine.get(node.line) ?? []
		comments.push(...text.replace(/\u200b/g, "").split("\n"))
		commentsByLine.set(node.line, comments)
	}
	for (const [line, comments] of [...commentsByLine].sort(
		(l, r) => r[0] - l[0]
	)) {
		const indent = /^\s*/.exec(lines[line])![0]
		lines.splice(line + 1, 0, ...comments.map(text => `${indent}// ${text}`))
	}
	return trimBlankLines(lines.map(removeNotation)).join("\n")
}

const runtimeResultPattern = /^(?:throws|ArkErrors|\w*Error)\b/

/** whether a line's compile error is already written as a comment beside or above it */
const hasErrorComment = (lines: string[], line: number) => {
	if (/^\s*\/\/ TypeScript:/.test(lines[line - 1] ?? "")) return true
	const trailing = /\S\s+\/\/\s+(.*)$/.exec(lines[line])?.[1]
	return trailing !== undefined && !runtimeResultPattern.test(trailing)
}

const removeNotation = (line: string) =>
	line.replace(/\s*\/\/ \[!code [^\]]+]/, "")

const trimBlankLines = (lines: string[]) => {
	while (lines[0]?.trim() === "") lines.shift()
	while (lines.at(-1)?.trim() === "") lines.pop()
	return lines
}

/** removes hidden lines and compiler directives that only twoslash reads */
export const stripTwoslash = (code: string): string => {
	const lines = code.split("\n")
	const cutIndex = lines.findIndex(line => line.trim() === "// ---cut---")
	const visible: string[] = []
	let inCut = false

	for (const line of lines.slice(cutIndex + 1)) {
		const trimmed = line.trim()
		if (trimmed === "// ---cut-after---") break
		if (trimmed === "// ---cut-start---") inCut = true
		else if (trimmed === "// ---cut-end---") inCut = false
		else if (inCut || /^\/\/ @(?!ts-)\w+(:.*)?$/.test(trimmed)) continue
		else if (/^\/\/\s*\^[?|]/.test(trimmed)) {
			const annotation = trimmed.replace(/^\/\/\s*\^[?|]\s*/, "")
			if (annotation) visible.push(`${/^\s*/.exec(line)![0]}// ${annotation}`)
		} else visible.push(removeNotation(line))
	}

	return trimBlankLines(visible).join("\n")
}
