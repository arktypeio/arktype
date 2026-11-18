import {
	createTransformerFactory,
	rendererRich,
	type TwoslashShikiFunction,
	type TwoslashShikiReturn
} from "@shikijs/twoslash/core"
import type { ElementContent } from "hast"
import { fromMarkdown } from "mdast-util-from-markdown"
import { gfmFromMarkdown } from "mdast-util-gfm"
import { defaultHandlers, toHast } from "mdast-util-to-hast"
import { gfm } from "micromark-extension-gfm"
import { createHash } from "node:crypto"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"
import type { ShikiTransformer, ShikiTransformerContextCommon } from "shiki"
import { createTwoslasher } from "twoslash"
import { twoslashLangs, twoslashOptions } from "../shiki.ts"
import { cacheDir, docsDir, repoArkDir } from "./paths.ts"

/**
 * Packages whose declarations snippets can import. Their emitted .d.ts
 * files are part of the cache key, so rebuilding a package after changing
 * its types invalidates every cached hover.
 */
const snippetPackages = [
	"type",
	"schema",
	"util",
	"regex",
	"attest",
	"json-schema",
	"fast-check",
	"sets",
	"fs",
	"aot"
]

const filesUnder = (dir: string): string[] =>
	existsSync(dir) ?
		readdirSync(dir, { withFileTypes: true, recursive: true })
			.filter(entry => entry.isFile() && entry.name.endsWith(".d.ts"))
			.map(entry => join(entry.parentPath, entry.name))
			.sort()
	:	[]

/** bump when the shape of cached results changes */
const cacheFormat = "1"

let fingerprint: string | undefined

/**
 * A hash of everything besides a snippet's own code that its result depends
 * on: twoslash's options (lib/shiki.ts), the docs' dependency versions and
 * the declarations snippets can import.
 */
const twoslashFingerprint = (): string => {
	if (fingerprint) return fingerprint
	const hash = createHash("sha256").update(cacheFormat)
	for (const file of [
		"lib/shiki.ts",
		"package.json",
		"node_modules/typescript/package.json",
		"node_modules/twoslash/package.json"
	])
		hash.update(readFileSync(join(docsDir, file)))

	for (const pkg of snippetPackages) {
		for (const file of filesUnder(join(repoArkDir, pkg, "out"))) {
			hash.update(file)
			hash.update(readFileSync(file))
		}
	}
	return (fingerprint = hash.digest("hex"))
}

const twoslashCacheDir = join(cacheDir, "twoslash")

const memoryCache = new Map<string, TwoslashShikiReturn>()

const baseTwoslasher = createTwoslasher(twoslashOptions)

/**
 * Runs twoslash, caching each result in memory and on disk by a hash of the
 * snippet, its options and {@link twoslashFingerprint}.
 */
export const twoslasher: TwoslashShikiFunction = (code, lang, options) => {
	const key = createHash("sha256")
		.update(twoslashFingerprint())
		.update("\0")
		.update(lang ?? "")
		.update("\0")
		.update(JSON.stringify(options ?? {}))
		.update("\0")
		.update(code)
		.digest("hex")

	const cached = memoryCache.get(key)
	if (cached) return cached

	const path = join(twoslashCacheDir, `${key}.json`)
	let result: TwoslashShikiReturn
	if (existsSync(path)) result = JSON.parse(readFileSync(path, "utf8"))
	else {
		const { code: output, nodes, meta } = baseTwoslasher(code, lang, options)
		result = { code: output, nodes, meta: { extension: meta.extension } }
		mkdirSync(twoslashCacheDir, { recursive: true })
		writeFileSync(path, JSON.stringify(result))
	}
	result = { ...result, nodes: result.nodes.filter(isShownNode) }
	memoryCache.set(key, result)
	return result
}

/** globals every snippet uses, whose signatures would bury the snippet's own types */
const unhoveredTargets = new Set(["type", "regex", "scope", "match"])

const functionHoverPattern = /^const [^:]+: (?:<[^(]*>)?\(/

/**
 * Hovers are kept for the values and types a snippet declares, not for the
 * globals it calls or for functions. Filtered after the cache, so changing
 * this never invalidates it.
 */
const isShownNode = (node: TwoslashShikiReturn["nodes"][number]) =>
	node.type !== "hover" ||
	(!unhoveredTargets.has(node.target) && !functionHoverPattern.test(node.text))

function renderMarkdown(
	this: ShikiTransformerContextCommon,
	md: string
): ElementContent[] {
	const mdast = fromMarkdown(
		// jsdoc {@link target} becomes the target's name
		md.replace(/{@link (?<link>[^}]*)}/g, "$1"),
		{ extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }
	)
	const hast = toHast(mdast, {
		handlers: {
			code: (state, node) =>
				node.lang ?
					(this.codeToHast(node.value, {
						...this.options,
						transformers: [],
						meta: {},
						lang: node.lang
					}).children[0] as never)
				:	defaultHandlers.code(state, node)
		}
	})
	return hast.type === "root" ?
			(hast.children as ElementContent[])
		:	[hast as ElementContent]
}

function renderMarkdownInline(
	this: ShikiTransformerContextCommon,
	md: string,
	context: string
): ElementContent[] {
	const text =
		context === "tag:param" ? md.replace(/^(?<link>[\w$-]+)/, "`$1` ") : md
	const children = renderMarkdown.call(this, text)
	return (
			children.length === 1 &&
				children[0].type === "element" &&
				children[0].tagName === "p"
		) ?
			children[0].children
		:	children
}

/**
 * Twoslash hovers rendered as static markup.
 *
 * Each hover's popup stays hidden inside its token; components/TwoslashPopups.tsx
 * copies it into the page's one quickinfo when the token is hovered, focused
 * or tapped. Queries (`// ^?`) render as their own line below the code they
 * describe, which lib/content/highlight.ts turns into a result band.
 */
export const twoslashTransformer: ShikiTransformer = createTransformerFactory(
	twoslasher,
	rendererRich({
		jsdoc: true,
		queryRendering: "line",
		renderMarkdown,
		renderMarkdownInline,
		hast: {
			hoverToken: { properties: { tabIndex: 0 } }
		}
	})
)({
	langs: [...twoslashLangs],
	explicitTrigger: false,
	twoslashOptions,
	// a snippet that doesn't type-check fails a production build; in
	// development it renders without hovers so the rest of the page works
	...(process.env.NODE_ENV !== "production" && {
		onTwoslashError: (error, code) => {
			console.error(
				`twoslash failed, so this block has no hovers:\n${code}\n\n${error}`
			)
		}
	})
})
