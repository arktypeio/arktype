// A small tree-sitter highlighter: parses a file with its host grammar,
// follows injection queries into nested layers (Markdown fence -> TypeScript
// -> ArkType) and collects every layer's highlight captures. Editors differ
// in how they pick between overlapping captures, so resolving them is a
// separate, parameterized step.
import { readFileSync } from "node:fs"
import {
	Language,
	Parser,
	Query,
	type Node,
	type QueryMatch,
	type Range
} from "web-tree-sitter"

export type LanguageConfig = {
	/** path to the grammar's .wasm */
	wasm: string
	/** path to highlights.scm, if this layer's captures matter */
	highlights?: string
	/** paths to injection queries, concatenated */
	injections?: string[]
}

export type LayerOptions = {
	/** grammars by the name an injection query gives them */
	languages: Record<string, LanguageConfig>
	/** injection language names to keys of `languages` (`ts` -> `typescript`) */
	aliases?: Record<string, string>
	/** Whether an injection always covers its whole content node, as in Zed,
	 * which ignores `injection.include-children` (syntax_map.rs, get_injections) */
	wholeNodeInjections?: boolean
}

export type Capture = {
	/** UTF-16 offsets, end exclusive */
	start: number
	end: number
	name: string
	language: string
	/** 0 for the host, 1 for a language it injects, and so on */
	depth: number
	pattern: number
}

type LoadedLanguage = {
	language: Language
	highlights: Query | undefined
	injections: Query | undefined
}

let initialized: Promise<void> | undefined

const readQuery = (paths: string[]) =>
	paths.map(path => readFileSync(path, "utf8")).join("\n")

export const createLayers = async (options: LayerOptions) => {
	initialized ??= Parser.init()
	await initialized
	const loaded = new Map<string, LoadedLanguage>()
	for (const [name, config] of Object.entries(options.languages)) {
		const language = await Language.load(readFileSync(config.wasm))
		loaded.set(name, {
			language,
			highlights:
				config.highlights ?
					new Query(language, readQuery([config.highlights]))
				:	undefined,
			injections:
				config.injections?.length ?
					new Query(language, readQuery(config.injections))
				:	undefined
		})
	}
	const parser = new Parser()

	const resolveLanguage = (name: string) => {
		const key = options.aliases?.[name] ?? name
		return loaded.has(key) ? key : undefined
	}

	const injectionLanguage = (match: QueryMatch, text: string) => {
		const fromCapture = match.captures.find(
			c => c.name === "injection.language"
		)
		if (fromCapture)
			return text.slice(fromCapture.node.startIndex, fromCapture.node.endIndex)
		const fromProperty = match.setProperties?.["injection.language"]
		return fromProperty ?? undefined
	}

	// the parts of `node` an injection covers: all of it with
	// injection.include-children, otherwise the gaps between its named
	// children (Markdown's fence content has anonymous tokens for punctuation,
	// which editors don't cut out),
	// in both cases clipped to the ranges the parent layer was parsed with
	const contentRanges = (
		node: Node,
		includeChildren: boolean,
		parentRanges: Range[]
	): Range[] => {
		let ranges: Range[] = [rangeOf(node)]
		if (!includeChildren) {
			ranges = []
			let cursor = { index: node.startIndex, position: node.startPosition }
			for (const child of node.namedChildren) {
				if (!child) continue
				if (child.startIndex > cursor.index) {
					ranges.push({
						startIndex: cursor.index,
						startPosition: cursor.position,
						endIndex: child.startIndex,
						endPosition: child.startPosition
					})
				}
				cursor = { index: child.endIndex, position: child.endPosition }
			}
			if (node.endIndex > cursor.index) {
				ranges.push({
					startIndex: cursor.index,
					startPosition: cursor.position,
					endIndex: node.endIndex,
					endPosition: node.endPosition
				})
			}
		}
		return ranges.flatMap(range =>
			parentRanges.flatMap(parent => {
				const startIndex = Math.max(range.startIndex, parent.startIndex)
				const endIndex = Math.min(range.endIndex, parent.endIndex)
				if (startIndex >= endIndex) return []
				return [
					{
						startIndex,
						endIndex,
						startPosition:
							startIndex === range.startIndex ?
								range.startPosition
							:	parent.startPosition,
						endPosition:
							endIndex === range.endIndex ?
								range.endPosition
							:	parent.endPosition
					}
				]
			})
		)
	}

	const highlightLayer = (
		text: string,
		languageName: string,
		ranges: Range[] | undefined,
		depth: number,
		captures: Capture[]
	) => {
		const { language, highlights, injections } = loaded.get(languageName)!
		parser.setLanguage(language)
		const tree = parser.parse(
			text,
			null,
			ranges ? { includedRanges: ranges } : {}
		)
		if (!tree) throw new Error(`Couldn't parse a ${languageName} layer`)
		const layerRanges = ranges ?? [rangeOf(tree.rootNode)]
		for (const c of highlights?.captures(tree.rootNode) ?? []) {
			if (c.name.startsWith("_")) continue
			captures.push({
				start: c.node.startIndex,
				end: c.node.endIndex,
				name: c.name,
				language: languageName,
				depth,
				pattern: c.patternIndex
			})
		}
		// as tree-sitter-highlight does, one injection per content node: the
		// last pattern to match it
		const byNode = new Map<number, { language: string; ranges: Range[] }>()
		for (const match of injections?.matches(tree.rootNode) ?? []) {
			const content = match.captures.find(c => c.name === "injection.content")
			if (!content) continue
			const name = injectionLanguage(match, text)
			const resolved = name && resolveLanguage(name)
			if (!resolved) continue
			const includeChildren =
				options.wholeNodeInjections ||
				(match.setProperties !== undefined &&
					"injection.include-children" in match.setProperties)
			byNode.set(content.node.id, {
				language: resolved,
				ranges: contentRanges(content.node, includeChildren, layerRanges)
			})
		}
		const childLayers = [...byNode.values()]
		tree.delete()
		for (const child of childLayers) {
			if (child.ranges.length)
				highlightLayer(text, child.language, child.ranges, depth + 1, captures)
		}
	}

	return (text: string, hostLanguage: string): Capture[] => {
		const captures: Capture[] = []
		highlightLayer(text, hostLanguage, undefined, 0, captures)
		return captures
	}
}

const rangeOf = (node: Node): Range => ({
	startIndex: node.startIndex,
	endIndex: node.endIndex,
	startPosition: node.startPosition,
	endPosition: node.endPosition
})

export type Precedence =
	/** Zed and Neovim: deeper layers win, then inner nodes, then later patterns */
	| "last-pattern"
	/** Helix: as above, but the earlier pattern wins on the same node */
	| "first-pattern"

/**
 * The capture that styles each UTF-16 offset of the text, or undefined.
 * Captures are stacked in order of start, then longer first, then depth, then
 * pattern, and the top of the stack wins.
 */
export const resolveCaptures = (
	length: number,
	captures: Capture[],
	precedence: Precedence = "last-pattern"
): (Capture | undefined)[] => {
	const sorted = [...captures].sort(
		(a, b) =>
			a.start - b.start ||
			b.end - b.start - (a.end - a.start) ||
			a.depth - b.depth ||
			(precedence === "last-pattern" ?
				a.pattern - b.pattern
			:	b.pattern - a.pattern)
	)
	const byOffset: (Capture | undefined)[] = Array.from({ length })
	for (const capture of sorted) {
		for (let i = capture.start; i < capture.end && i < length; i++)
			byOffset[i] = capture
	}
	return byOffset
}
