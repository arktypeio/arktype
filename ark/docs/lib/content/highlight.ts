import { transformerNotationErrorLevel } from "@shikijs/transformers"
import type { Element, ElementContent, Root } from "hast"
import { toString } from "hast-util-to-string"
import {
	createHighlighter,
	createJavaScriptRegexEngine,
	hastToHtml,
	type Highlighter,
	type ShikiTransformer
} from "shiki"
import { EXIT, SKIP, visit } from "unist-util-visit"
import {
	arkDarkTheme,
	arkLightTheme,
	arkThemes,
	arkTypeScript,
	highlightLangs
} from "../shiki.ts"
import { twoslashTransformer } from "./twoslash.ts"

let highlighter: Promise<Highlighter> | undefined

const getHighlighter = () =>
	(highlighter ??= createHighlighter({
		themes: [arkDarkTheme, arkLightTheme],
		langs: [arkTypeScript, ...highlightLangs.filter(lang => lang !== "ts")],
		engine: createJavaScriptRegexEngine({ forgiving: true })
	}))

const runtimeResultPattern =
	/^\s*\/\/ (?:throws )?(?:ArkErrors|ParseError|TraversalError):/
const compileResultPattern = /^\s*\/\/ TypeScript:/
const continuationPattern = /^\s*\/\/\s{2,}\S/

/**
 * Marks result comments on their own line, ErrorLens style: `// ArkErrors:`,
 * `// ParseError:` and `// TraversalError:` (optionally after `throws`) as
 * runtime, `// TypeScript:` as compile, plus each following line that
 * continues one, indented two or more spaces past its `//`.
 */
const resultLineTransformer = (): ShikiTransformer => {
	let previous: { line: number; kind: string } | undefined
	return {
		name: "ark:result-lines",
		preprocess: () => {
			previous = undefined
		},
		line(node, line) {
			const text = toString(node)
			const kind =
				runtimeResultPattern.test(text) ? "runtime"
				: compileResultPattern.test(text) ? "compile"
				: previous?.line === line - 1 && continuationPattern.test(text) ?
					previous.kind
				:	undefined
			if (!kind) return
			this.addClassToHast(node, ["error-line", kind])
			expandLeadingTabs(node)
			previous = { line, kind }
		}
	}
}

const tabSize = 4

/**
 * A result line's hanging indent (`text-indent: -3ch`) moves where its tab
 * stops fall, so its indentation is written as spaces to line up with the
 * code it annotates. The spaces sit in a span whose `data-indent` keeps the
 * original, which is what the copy button copies.
 */
const expandLeadingTabs = (line: Element) => {
	let column = 0
	visit(line, "text", (node, index, parent) => {
		const indent = /^[\t ]*/.exec(node.value)![0]
		const spaces = [...indent]
			.map(char => {
				const width = char === "\t" ? tabSize - (column % tabSize) : 1
				column += width
				return " ".repeat(width)
			})
			.join("")
		const rest = node.value.slice(indent.length)
		if (spaces === indent || !parent || index === undefined)
			return rest ? EXIT : undefined
		const expanded: ElementContent = {
			type: "element",
			tagName: "span",
			properties: { "data-indent": indent },
			children: [{ type: "text", value: spaces }]
		}
		parent.children.splice(
			index,
			1,
			expanded,
			...(rest ? [{ type: "text" as const, value: rest }] : [])
		)
		return rest ? EXIT : [SKIP, index + 1]
	})
}

const transformers = [
	resultLineTransformer(),
	twoslashTransformer,
	transformerNotationErrorLevel()
]

export type HighlightOptions = {
	/** @default "ts" */
	lang?: string
	/** the code fence's meta string, e.g. `title="config.ts"` */
	meta?: string
}

const titlePattern = /\btitle=(?:"([^"]*)"|'([^']*)')/

/**
 * Highlights code with ArkDark and ArkLight, running twoslash on ts and js.
 *
 * Returns the `pre` element, with a `data-title` property when the meta
 * string has a `title="..."`. Its tokens are in its `tokens` property as one
 * HTML string rather than as children (see `inlineTokens`).
 */
export const highlight = async (
	code: string,
	{ lang = "ts", meta = "" }: HighlightOptions = {}
): Promise<Element> => {
	const shiki = await getHighlighter()
	const loaded = shiki.getLoadedLanguages()
	const resolvedLang = loaded.includes(lang) ? lang : "text"

	let root: Root
	try {
		root = shiki.codeToHast(code, {
			lang: resolvedLang,
			...arkThemes,
			meta: { __raw: meta },
			transformers
		})
	} catch (e) {
		throw new Error(
			`Failed to highlight this ${lang} block:\n${code}\n\n${e instanceof Error ? e.message : e}`,
			{ cause: e }
		)
	}

	const pre = root.children[0] as Element
	finishTwoslash(pre)
	const title = titlePattern.exec(meta)
	if (title) pre.properties["data-title"] = title[1] ?? title[2]
	pre.properties["data-lang"] = lang
	inlineTokens(pre)
	return pre
}

/**
 * Moves a `pre`'s children into its `tokens` property as one HTML string,
 * which the `pre` components render with `dangerouslySetInnerHTML`. A code
 * block is static and a few hundred spans, each popup more, so as React
 * children they would be sent again in the page's payload and hydrated one
 * by one; as a string they're only the HTML.
 */
const inlineTokens = (pre: Element) => {
	pre.properties.tokens = hastToHtml(pre.children)
	pre.children = []
}

/** shiki writes classes as a `class` string, mdast-util-to-hast as `className` */
const classesOf = (node: Element): string[] => {
	const { class: classString, className } = node.properties
	return (
		Array.isArray(className) ? className.map(String)
		: typeof classString === "string" ? classString.split(" ")
		: []
	)
}

const hasClass = (node: Element, name: string) => classesOf(node).includes(name)

const setClasses = (node: Element, classes: string[]) => {
	delete node.properties.class
	node.properties.className = classes
}

const isElement = (node: ElementContent | undefined): node is Element =>
	node?.type === "element"

/**
 * Cleans up after twoslash's rich renderer:
 *
 * - a `// ^?` result becomes a `.query-block` band after its line, and a
 *   query on the last line leaves no empty line behind
 * - each line twoslash inserts after a line of code gets back the line
 *   break it took, so copied code keeps its lines
 * - a token whose hover was filtered out is no longer styled as one
 * - the code inside popups isn't a tab stop; the tokens are
 * - a `// [!code error]` line reads as a runtime result
 */
const finishTwoslash = (pre: Element) => {
	visit(pre, "element", node => {
		if (node !== pre && node.tagName === "pre") {
			delete node.properties.tabIndex
			delete node.properties.tabindex
		}
	})
	visit(pre, "element", (node, i, parent) => {
		if (hasClass(node, "twoslash-hover") && !node.children.some(isPopup)) {
			setClasses(
				node,
				classesOf(node).filter(name => name !== "twoslash-hover")
			)
		}
		if (
			hasClass(node, "highlighted") &&
			hasClass(node, "error") &&
			!hasClass(node, "error-line")
		) {
			setClasses(node, [...classesOf(node), "error-line", "runtime"])
			expandLeadingTabs(node)
		}
		if (!hasClass(node, "twoslash-meta-line") || !parent || i === undefined)
			return
		const replacement =
			hasClass(node, "twoslash-query-line") ? queryBlock(node) : node
		const before = parent.children[i - 1]
		const needsBreak = before?.type !== "text" || !before.value.endsWith("\n")
		parent.children.splice(
			i,
			1,
			...(needsBreak ? [{ type: "text", value: "\n" } as const] : []),
			replacement
		)
		return [SKIP, i + (needsBreak ? 2 : 1)]
	})
	const code = pre.children.find(isElement)
	const [beforeLast, last] = code?.children.slice(-2) ?? []
	if (
		isElement(beforeLast) &&
		hasClass(beforeLast, "query-block") &&
		isElement(last) &&
		hasClass(last, "line") &&
		!toString(last)
	)
		code!.children.pop()
}

const isPopup = (node: ElementContent) =>
	isElement(node) && hasClass(node, "twoslash-popup-container")

const queryBlock = (line: Element): Element => {
	const popup = line.children.find(isPopup)
	return {
		type: "element",
		tagName: "span",
		properties: { className: ["query-block"] },
		children:
			isElement(popup) ?
				popup.children.filter(
					child =>
						!(isElement(child) && hasClass(child, "twoslash-popup-arrow"))
				)
			:	[]
	}
}

/**
 * Rehype plugin that replaces each Markdown code block with its
 * highlighted version.
 */
export const rehypeHighlight = () => async (tree: Root) => {
	const blocks: { pre: Element; code: Element }[] = []
	visit(tree, "element", node => {
		if (node.tagName !== "pre") return
		const code = node.children.find(
			(child): child is Element =>
				child.type === "element" && child.tagName === "code"
		)
		if (code) blocks.push({ pre: node, code })
	})

	// twoslash is synchronous, so highlighting in sequence costs nothing
	for (const { pre, code } of blocks) {
		const className = code.properties.className
		const lang =
			Array.isArray(className) ?
				className
					.map(String)
					.find(name => name.startsWith("language-"))
					?.slice("language-".length)
			:	undefined
		const meta = (code.data as { meta?: string } | undefined)?.meta ?? ""
		const highlighted = await highlight(toString(code).replace(/\n$/, ""), {
			lang: lang ?? "text",
			meta
		})
		pre.properties = highlighted.properties
		pre.children = highlighted.children as ElementContent[]
	}
}
