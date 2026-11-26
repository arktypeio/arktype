// Runs the tree-sitter grammar over the conformance corpus the way an editor
// would and reports what its ArkType layers style, in the conformance span
// format. Editor targets (Zed, Neovim, Helix) reuse it with their own host
// grammars, queries and precedence.
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
	readExpected,
	readSource
} from "@ark/editor-conformance/highlighting/check.ts"
import {
	toSpans,
	type CharCategory,
	type Span
} from "@ark/editor-conformance/highlighting/spans.ts"
import {
	createLayers,
	resolveCaptures,
	type LanguageConfig,
	type Precedence
} from "./layers.ts"

const root = new URL("../", import.meta.url)
const path = (relative: string) => fileURLToPath(new URL(relative, root))
const modules = (relative: string) => path(`node_modules/${relative}`)

export const arktypeWasm = path("tree-sitter-arktype.wasm")
export const ecmaInjections = path("queries/ecma/injections.scm")
export const treeSitterCli = modules("tree-sitter-cli/cli.js")

const categories: string[] = JSON.parse(
	readFileSync(
		new URL(
			import.meta.resolve(
				"@ark/editor-conformance/highlighting/categories.json"
			)
		),
		"utf8"
	)
).rules.map((rule: { category: string }) => rule.category)

/** A capture name as a conformance category, dropping trailing segments until one matches. */
export const categoryOfCapture = (capture: string): string | undefined => {
	const parts = capture.split(".")
	while (parts.length) {
		const candidate = parts.join(".")
		if (candidate === "none" || categories.includes(candidate)) return candidate
		parts.pop()
	}
	return undefined
}

// Markdown ships no .wasm, so it's built from the package's sources once
const markdownWasm = (): string | undefined => {
	const out = path("test/.wasm/tree-sitter-markdown.wasm")
	if (existsSync(out)) return out
	mkdirSync(path("test/.wasm"), { recursive: true })
	try {
		execFileSync(
			process.execPath,
			[
				treeSitterCli,
				"build",
				"--wasm",
				"-o",
				out,
				modules(
					"@tree-sitter-grammars/tree-sitter-markdown/tree-sitter-markdown"
				)
			],
			{ stdio: "pipe" }
		)
		return out
	} catch (e) {
		console.warn(`couldn't build the Markdown grammar: ${e}`)
		return undefined
	}
}

/** The upstream grammars each corpus extension is parsed with. */
export const defaultLanguages = (): Record<string, LanguageConfig> => {
	const markdown = markdownWasm()
	return {
		typescript: {
			wasm: modules("tree-sitter-typescript/tree-sitter-typescript.wasm"),
			injections: [ecmaInjections]
		},
		tsx: {
			wasm: modules("tree-sitter-typescript/tree-sitter-tsx.wasm"),
			injections: [ecmaInjections]
		},
		javascript: {
			wasm: modules("tree-sitter-javascript/tree-sitter-javascript.wasm"),
			injections: [ecmaInjections]
		},
		svelte: {
			wasm: modules(
				"@tree-sitter-grammars/tree-sitter-svelte/tree-sitter-svelte.wasm"
			),
			injections: [
				modules(
					"@tree-sitter-grammars/tree-sitter-svelte/queries/injections.scm"
				),
				path("test/hosts/svelte.scm")
			]
		},
		...(markdown && {
			markdown: {
				wasm: markdown,
				injections: [
					modules(
						"@tree-sitter-grammars/tree-sitter-markdown/tree-sitter-markdown/queries/injections.scm"
					)
				]
			}
		}),
		arktype: {
			wasm: arktypeWasm,
			highlights: path("queries/highlights.scm")
		}
	}
}

/** Fenced-code and attribute names editors resolve to these grammars. */
export const defaultAliases: Record<string, string> = {
	ts: "typescript",
	js: "javascript",
	jsx: "javascript",
	mjs: "javascript",
	cjs: "javascript"
}

/** The grammar each corpus extension opens with, where one is available. */
export const defaultHosts: Record<string, string> = {
	ts: "typescript",
	tsx: "tsx",
	js: "javascript",
	jsx: "javascript",
	svelte: "svelte",
	md: "markdown"
}

export type TargetOptions = {
	languages?: Record<string, LanguageConfig>
	aliases?: Record<string, string>
	hosts?: Record<string, string>
	precedence?: Precedence
	/** the layers whose captures count as the target's ArkType support */
	arktypeLanguages?: string[]
	/** captures the editor would style; others are transparent */
	captureFilter?: (capture: string) => boolean
	categoryOf?: (capture: string) => string | undefined
}

export type TargetOutput = {
	/** spans per fixture, for every fixture whose host is available */
	spans: Map<string, Span[]>
	/** fixtures with no host grammar, so not checked */
	skipped: string[]
}

export const runTarget = async (
	options: TargetOptions = {}
): Promise<TargetOutput> => {
	const languages = options.languages ?? defaultLanguages()
	const hosts = options.hosts ?? defaultHosts
	const arktypeLanguages = options.arktypeLanguages ?? ["arktype"]
	const categoryOf = options.categoryOf ?? categoryOfCapture
	const highlight = await createLayers({
		languages,
		aliases: options.aliases ?? defaultAliases
	})
	const spans = new Map<string, Span[]>()
	const skipped: string[] = []
	for (const fixture of readExpected().keys()) {
		const host = hosts[fixture.split(".").pop()!]
		if (!host || !languages[host]) {
			skipped.push(fixture)
			continue
		}
		const source = readSource(fixture)
		const captures = highlight(source, host).filter(
			c =>
				arktypeLanguages.includes(c.language) &&
				(options.captureFilter?.(c.name) ?? true)
		)
		const byOffset = resolveCaptures(
			source.length,
			captures,
			options.precedence
		)
		const lines = source.split("\n")
		let offset = 0
		const chars = lines.map(text => {
			const line = Array.from(text, (_, column): CharCategory | undefined => {
				const capture = byOffset[offset + column]
				const category = capture && categoryOf(capture.name)
				return category ? { category } : undefined
			})
			offset += text.length + 1
			return line
		})
		spans.set(
			fixture,
			toSpans(lines, chars).map(
				({ line, column, length, text, category }): Span => ({
					line,
					column,
					length,
					text,
					category
				})
			)
		)
	}
	return { spans, skipped }
}

const fromHelix: Record<string, string> = {
	"constant.numeric": "number",
	namespace: "module"
}

/** The tree-sitter target as Helix runs it: its query names and first-pattern precedence. */
export const helixTargetOptions = (): TargetOptions => {
	const languages = defaultLanguages()
	return {
		languages: {
			...languages,
			arktype: {
				...languages.arktype,
				highlights: path("helix/runtime/queries/arktype/highlights.scm")
			}
		},
		precedence: "first-pattern",
		categoryOf: capture => categoryOfCapture(fromHelix[capture] ?? capture)
	}
}
