/**
 * Highlights the conformance corpus the way Zed would with this extension and
 * the upstream injections it needs (README.md), and reports the characters
 * whose style comes from ArkType, for `checkTarget("zed", ...)`.
 *
 * It follows Zed's own rules rather than the shared tree-sitter target's:
 * - every layer's captures compete, host included, ordered by start, then
 *   longer first, then layer depth, then pattern, the last one winning
 *   (crates/language/src/buffer.rs, BufferChunks; syntax_map.rs, sort_key)
 * - a capture the theme has no style for is skipped, so the one beneath it
 *   shows (crates/syntax_theme/src/syntax_theme.rs, highlight_id)
 */
import {
	readExpected,
	readSource
} from "@ark/editor-conformance/highlighting/check.ts"
import {
	toSpans,
	type CharCategory,
	type Span
} from "@ark/editor-conformance/highlighting/spans.ts"
import { join } from "node:path"
import {
	createLayers,
	resolveCaptures,
	type LanguageConfig
} from "tree-sitter-arktype/test/layers.ts"
import {
	arktypeWasm,
	categoryOfCapture,
	ecmaInjections
} from "tree-sitter-arktype/test/target.ts"
import { zedCaptures } from "../writeQueries.ts"
import { buildZedLanguages } from "./zedLanguages.ts"

/**
 * The syntax styles of One Dark, Zed's default theme (assets/themes/one at
 * zedRev). Every theme Zed ships has these keys.
 */
const themeStyles = [
	"attribute",
	"boolean",
	"comment",
	"comment.doc",
	"constant",
	"constructor",
	"embedded",
	"emphasis",
	"emphasis.strong",
	"enum",
	"function",
	"hint",
	"keyword",
	"label",
	"link_text",
	"link_uri",
	"namespace",
	"number",
	"operator",
	"predictive",
	"preproc",
	"primary",
	"property",
	"punctuation",
	"punctuation.bracket",
	"punctuation.delimiter",
	"punctuation.list_marker",
	"punctuation.markup",
	"punctuation.special",
	"selector",
	"selector.pseudo",
	"string",
	"string.escape",
	"string.regex",
	"string.special",
	"string.special.symbol",
	"tag",
	"text.literal",
	"title",
	"type",
	"variable",
	"variable.parameter",
	"variable.special",
	"variant"
]

/** Whether the theme styles a capture: one of its styles is a dot-prefix of it. */
export const isStyled = (capture: string): boolean =>
	themeStyles.some(
		style => capture === style || capture.startsWith(`${style}.`)
	)

const sharedCaptureOf = Object.fromEntries(
	Object.entries(zedCaptures).map(([shared, zed]) => [zed, shared])
)

/** A capture in Zed's ArkType highlights as a conformance category. */
export const zedCategoryOf = (capture: string): string | undefined =>
	categoryOfCapture(sharedCaptureOf[capture] ?? capture)

/** The grammar each corpus file opens with in Zed (with its extensions). */
const zedHosts: Record<string, string> = {
	ts: "typescript",
	tsx: "tsx",
	js: "javascript",
	jsx: "javascript",
	md: "markdown",
	mdx: "mdx",
	svelte: "svelte",
	vue: "vue",
	astro: "astro"
}

/**
 * Where the upstream changes add ArkType's injections: Zed's own TypeScript,
 * TSX and JavaScript, and the MDX extension, whose grammar parses ESM itself.
 */
export const ecmaHosts = ["typescript", "tsx", "javascript", "mdx"]

export type ZedTargetOutput = {
	spans: Map<string, Span[]>
	skipped: string[]
}

export const runZedTarget = async (): Promise<ZedTargetOutput> => {
	const built = await buildZedLanguages({
		extraInjections: Object.fromEntries(
			ecmaHosts.map(host => [host, [ecmaInjections]])
		)
	})
	const languages: Record<string, LanguageConfig> = {
		...built,
		arktype: {
			wasm: arktypeWasm,
			highlights: join(
				import.meta.dirname,
				"..",
				"languages",
				"arktype",
				"highlights.scm"
			)
		}
	}
	// Zed finds an injected language by name, ignoring case
	const aliases: Record<string, string> = {}
	for (const [key, { names }] of Object.entries(built)) {
		for (const name of names) {
			aliases[name] = key
			aliases[name.toLowerCase()] = key
		}
	}
	const highlight = await createLayers({
		languages,
		aliases,
		wholeNodeInjections: true
	})

	const spans = new Map<string, Span[]>()
	const skipped: string[] = []
	for (const fixture of readExpected().keys()) {
		const host = zedHosts[fixture.split(".").pop()!]
		if (!host) {
			skipped.push(fixture)
			continue
		}
		const source = readSource(fixture)
		const byOffset = resolveCaptures(
			source.length,
			highlight(source, host).filter(capture => isStyled(capture.name)),
			"last-pattern"
		)
		const lines = source.split("\n")
		let offset = 0
		const chars = lines.map(text => {
			const line = Array.from(text, (_, column): CharCategory | undefined => {
				const capture = byOffset[offset + column]
				const category =
					capture?.language === "arktype" && zedCategoryOf(capture.name)
				return category ? { category } : undefined
			})
			offset += text.length + 1
			return line
		})
		spans.set(fixture, toSpans(lines, chars))
	}
	return { spans, skipped }
}
