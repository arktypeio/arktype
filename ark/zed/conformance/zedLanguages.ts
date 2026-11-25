/**
 * The grammars and queries Zed highlights the conformance corpus with, at the
 * revisions Zed pins: its built-in languages from zed-industries/zed, and
 * Svelte, Vue, Astro, MDX and HTML from the extensions Zed's registry ships.
 *
 * Zed's queries are GPL-licensed, so they're fetched into a cache in the
 * system's temporary directory rather than kept here.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

/** zed-industries/zed main on 2026-11-24 */
export const zedRev = "0be6d5990f9f6e3917464603a99808502cc824af"

type Source = {
	repository: string
	rev: string
	/** the grammar's directory in the repository */
	path?: string
}

type QuerySource = Source & { path: string }

export type ZedLanguageSource = {
	/** Zed's name for the language, then the injection names that reach it */
	names: string[]
	grammar: Source
	queries: QuerySource
}

const zed = (language: string): QuerySource => ({
	repository: "https://github.com/zed-industries/zed",
	rev: zedRev,
	path: `crates/grammars/src/${language}`
})

const zedTypescript = (path: string): Source => ({
	// Cargo.toml: the fork with tree-sitter/tree-sitter-typescript#347
	repository: "https://github.com/zed-industries/tree-sitter-typescript",
	rev: "e2c53597d6a5d9cf7bbe8dccde576fe1e46c5899",
	path
})

const tag = (name: string, version: string): Source => ({
	repository: `https://github.com/tree-sitter/tree-sitter-${name}`,
	rev: `v${version}`
})

const zedMarkdown = (path: string): Source => ({
	repository: "https://github.com/zed-industries/tree-sitter-markdown",
	rev: "b596e737286780d7bfa9fcddceaeeb754574b352",
	path
})

export const zedLanguageSources: Record<string, ZedLanguageSource> = {
	typescript: {
		names: ["TypeScript", "typescript", "ts"],
		grammar: zedTypescript("typescript"),
		queries: zed("typescript")
	},
	tsx: {
		names: ["TSX", "tsx"],
		grammar: zedTypescript("tsx"),
		queries: zed("tsx")
	},
	// Zed parses JavaScript with the TSX grammar
	javascript: {
		names: ["JavaScript", "javascript", "js", "jsx", "mjs", "cjs"],
		grammar: zedTypescript("tsx"),
		queries: zed("javascript")
	},
	jsdoc: {
		names: ["JSDoc", "jsdoc"],
		grammar: tag("jsdoc", "0.23.2"),
		queries: zed("jsdoc")
	},
	regex: {
		names: ["Regular Expression", "regex"],
		grammar: tag("regex", "0.24.3"),
		queries: zed("regex")
	},
	json: {
		names: ["JSON", "json"],
		grammar: tag("json", "0.24.8"),
		queries: zed("json")
	},
	css: {
		names: ["CSS", "css"],
		grammar: tag("css", "0.23.2"),
		queries: zed("css")
	},
	markdown: {
		names: ["Markdown", "markdown", "md"],
		grammar: zedMarkdown("tree-sitter-markdown"),
		queries: zed("markdown")
	},
	"markdown-inline": {
		names: ["Markdown-Inline", "markdown-inline"],
		grammar: zedMarkdown("tree-sitter-markdown-inline"),
		queries: zed("markdown-inline")
	},
	html: {
		names: ["HTML", "html"],
		grammar: {
			repository: "https://github.com/tree-sitter/tree-sitter-html",
			rev: "bfa075d83c6b97cd48440b3829ab8d24a2319809"
		},
		queries: {
			repository: "https://github.com/zed-industries/zed",
			rev: zedRev,
			path: "extensions/html/languages/html"
		}
	},
	svelte: {
		names: ["Svelte", "svelte"],
		grammar: {
			repository: "https://github.com/tree-sitter-grammars/tree-sitter-svelte",
			rev: "3f06f705410683adb17d146b5eca28c62fe81ba6"
		},
		queries: {
			repository: "https://github.com/zed-extensions/svelte",
			rev: "ca6c2c6c891583a23820d9b23772e116426cc57d",
			path: "languages/svelte"
		}
	},
	vue: {
		names: ["Vue.js", "vue"],
		grammar: {
			repository: "https://github.com/tree-sitter-grammars/tree-sitter-vue",
			rev: "7e48557b903a9db9c38cea3b7839ef7e1f36c693"
		},
		queries: {
			repository: "https://github.com/zed-extensions/vue",
			rev: "7a57c87c8dde8b33002ea0a8e3d6e6e247fc9cca",
			path: "languages/vue"
		}
	},
	astro: {
		names: ["Astro", "astro"],
		grammar: {
			repository: "https://github.com/virchau13/tree-sitter-astro",
			rev: "4be180759ec13651f72bacee65fa477c64222a1a"
		},
		queries: {
			repository: "https://github.com/zed-extensions/astro",
			rev: "1f08b4175c2c79d79af4ca950db30f5a83999d5f",
			path: "languages/astro"
		}
	},
	mdx: {
		names: ["MDX", "mdx"],
		grammar: {
			repository: "https://github.com/srazzak/tree-sitter-mdx",
			rev: "0f2d4b204b231e5ebb7b94ff0259bee6c83ebc58"
		},
		queries: {
			repository: "https://github.com/srazzak/zed-mdx",
			rev: "82e48ed02888eb44e0e3e49b3ec5a060810f0a55",
			path: "languages/mdx"
		}
	}
}

export type BuiltLanguage = {
	names: string[]
	wasm: string
	highlights: string
	/** query files concatenated, absent for a language that injects nothing */
	injections?: string[]
}

const cacheDir = join(tmpdir(), "ark-zed-conformance")

const treeSitter = join(
	import.meta.dirname,
	"..",
	"node_modules",
	".bin",
	"tree-sitter"
)

const run = (command: string, args: string[], cwd?: string) =>
	execFileSync(command, args, { cwd, stdio: ["ignore", "ignore", "inherit"] })

const repositoryAt = (source: Source): string => {
	const dir = join(
		cacheDir,
		"repos",
		`${source.repository.split("/").slice(-2).join("-")}-${source.rev}`
	)
	if (existsSync(join(dir, ".git"))) return dir
	mkdirSync(dir, { recursive: true })
	run("git", ["init", "--quiet"], dir)
	run("git", ["remote", "add", "origin", source.repository], dir)
	run("git", ["fetch", "--quiet", "--depth", "1", "origin", source.rev], dir)
	run("git", ["checkout", "--quiet", "FETCH_HEAD"], dir)
	return dir
}

const buildGrammar = (name: string, source: Source): string => {
	const wasm = join(cacheDir, "wasm", `${name}.wasm`)
	if (existsSync(wasm)) return wasm
	const grammarDir = join(repositoryAt(source), source.path ?? "")
	if (!existsSync(join(grammarDir, "src", "parser.c")))
		run(treeSitter, ["generate"], grammarDir)
	mkdirSync(join(cacheDir, "wasm"), { recursive: true })
	run(treeSitter, ["build", "--wasm", "-o", wasm, "."], grammarDir)
	return wasm
}

/**
 * Zed reads `@content` and `language` as `@injection.content` and
 * `injection.language`, the names older queries (Svelte's, Vue's) still use.
 */
export const normalizeInjections = (query: string): string =>
	query
		.replace(/@content\b(?!\.)/g, "@injection.content")
		.replace(/@language\b(?!\.)/g, "@injection.language")
		.replace(/\(#set! +"?language"? /g, "(#set! injection.language ")

/**
 * Zed's predicates are Rust regexes. JavaScript has no flags group like
 * `(?s)`, but its `(?s:...)` scopes the same flags to what follows.
 */
export const jsCompatibleQuery = (query: string): string =>
	query.replace(
		/"\(\?([ims]+)\)((?:[^"\\]|\\.)*)"/g,
		(_, flags: string, pattern: string) => `"(?${flags}:${pattern})"`
	)

export type BuildOptions = {
	/** more injections for some languages, as the upstream changes add them */
	extraInjections?: Record<string, string[]>
}

/** A query file at its pinned revision, or undefined if there's none. */
const fetchQuery = async (
	source: QuerySource,
	file: string
): Promise<string | undefined> => {
	const cached = join(
		cacheDir,
		"queries",
		"source",
		`${source.repository.split("/").slice(-2).join("-")}-${source.rev}`,
		source.path,
		file
	)
	if (existsSync(cached)) {
		const text = readFileSync(cached, "utf8")
		return text === missing ? undefined : text
	}
	const [owner, repo] = source.repository.split("/").slice(-2)
	const response = await fetch(
		`https://raw.githubusercontent.com/${owner}/${repo}/${source.rev}/${source.path}/${file}`
	)
	if (!response.ok && response.status !== 404)
		throw new Error(`${response.status} fetching ${response.url}`)
	const text = response.ok ? await response.text() : missing
	mkdirSync(dirname(cached), { recursive: true })
	writeFileSync(cached, text)
	return text === missing ? undefined : text
}

// cached in place of a query a language doesn't have
const missing = "; none\n"

/** Fetches and builds every language Zed highlights the corpus with. */
export const buildZedLanguages = async ({
	extraInjections = {}
}: BuildOptions = {}): Promise<Record<string, BuiltLanguage>> => {
	const built: Record<string, BuiltLanguage> = {}
	for (const [name, source] of Object.entries(zedLanguageSources)) {
		const outDir = join(cacheDir, "queries", name)
		mkdirSync(outDir, { recursive: true })
		const highlights = join(outDir, "highlights.scm")
		const highlightsQuery = await fetchQuery(source.queries, "highlights.scm")
		if (highlightsQuery === undefined)
			throw new Error(`${name} has no highlights.scm`)
		writeFileSync(highlights, jsCompatibleQuery(highlightsQuery))
		const injections = [...(extraInjections[name] ?? [])]
		const ownInjections = await fetchQuery(source.queries, "injections.scm")
		if (ownInjections !== undefined) {
			const path = join(outDir, "injections.scm")
			writeFileSync(path, jsCompatibleQuery(normalizeInjections(ownInjections)))
			injections.unshift(path)
		}
		built[name] = {
			names: source.names,
			wasm: buildGrammar(name, source.grammar),
			highlights,
			...(injections.length ? { injections } : {})
		}
	}
	return built
}
