import { createOnigurumaEngine } from "@shikijs/engine-oniguruma"
import {
	INITIAL,
	Registry,
	type IGrammar,
	type IRawGrammar,
	type StateStack
} from "@shikijs/vscode-textmate"
import { readFileSync } from "node:fs"

// The VS Code extension's injection grammar, read from the extension itself so
// the oracle can never drift from what ships.
const arkInjectionPath = new URL(
	"../../extension/injected.tmLanguage.json",
	import.meta.url
)

const arkExtensionManifest = new URL(
	"../../extension/package.json",
	import.meta.url
)

export type Host = {
	/** the @shikijs/langs bundle the host's grammar comes from */
	bundle: string
	/** the TextMate scope VS Code tokenizes a file of this kind with */
	scopeName: string
}

/** Every file extension the corpus uses, keyed to the host VS Code opens it with. */
export const hosts: Record<string, Host> = {
	ts: { bundle: "typescript", scopeName: "source.ts" },
	tsx: { bundle: "tsx", scopeName: "source.tsx" },
	js: { bundle: "javascript", scopeName: "source.js" },
	jsx: { bundle: "jsx", scopeName: "source.js.jsx" },
	mdx: { bundle: "mdx", scopeName: "source.mdx" },
	svelte: { bundle: "svelte", scopeName: "source.svelte" },
	vue: { bundle: "vue", scopeName: "text.html.vue" },
	astro: { bundle: "astro", scopeName: "source.astro" },
	md: { bundle: "markdown", scopeName: "text.html.markdown" }
}

/**
 * Every bundle loaded, so an embedded language (TypeScript in a Markdown
 * fence, CSS in a Vue file) resolves to the same grammar VS Code would use.
 */
const bundles = [
	"typescript",
	"tsx",
	"javascript",
	"jsx",
	"mdx",
	"svelte",
	"vue",
	"astro",
	"markdown",
	"css",
	"html",
	"json",
	"scss",
	"less",
	"postcss",
	"sass",
	"stylus",
	"yaml",
	"toml",
	"pug"
]

type ShikiGrammar = IRawGrammar & {
	name: string
	injectTo?: string[]
}

const loadBundle = async (bundle: string): Promise<ShikiGrammar[]> =>
	(await import(`@shikijs/langs/${bundle}`)).default

export type ScopedToken = {
	line: number
	start: number
	end: number
	scopes: string[]
}

export type Tokenizer = (source: string, ext: string) => ScopedToken[][]

/**
 * Tokenizes a file the way VS Code does: the host grammar, the injections
 * its own bundle declares, and (when `ark` is set) the ArkType extension's
 * injection, registered for exactly the scopes its `injectTo` names.
 */
export const createTokenizer = async (opts: {
	ark: boolean
}): Promise<Tokenizer> => {
	const engine = await createOnigurumaEngine(
		import("@shikijs/engine-oniguruma/wasm-inlined")
	)
	const grammarsByBundle = new Map<string, ShikiGrammar[]>()
	for (const bundle of bundles)
		grammarsByBundle.set(bundle, await loadBundle(bundle))

	const byScope = new Map<string, ShikiGrammar>()
	for (const grammars of grammarsByBundle.values()) {
		for (const g of grammars)
			if (!byScope.has(g.scopeName)) byScope.set(g.scopeName, g)
	}

	const arkGrammar = JSON.parse(
		readFileSync(arkInjectionPath, "utf8")
	) as IRawGrammar
	const arkInjectTo: string[] = JSON.parse(
		readFileSync(arkExtensionManifest, "utf8")
	).contributes.grammars[0].injectTo

	const grammarCache = new Map<string, IGrammar>()

	const grammarFor = async (ext: string): Promise<IGrammar> => {
		const cached = grammarCache.get(ext)
		if (cached) return cached
		const host = hosts[ext]
		if (!host) throw new Error(`No TextMate host for .${ext}`)
		// injections a bundle declares, as the extension providing it would
		const injections = new Map<string, string[]>()
		const addInjection = (target: string, scopeName: string) => {
			const existing = injections.get(target) ?? []
			if (!existing.includes(scopeName)) existing.push(scopeName)
			injections.set(target, existing)
		}
		for (const g of grammarsByBundle.get(host.bundle)!)
			for (const target of g.injectTo ?? []) addInjection(target, g.scopeName)
		if (opts.ark) {
			for (const target of arkInjectTo)
				addInjection(target, arkGrammar.scopeName)
		}
		const registry = new Registry({
			onigLib: {
				createOnigScanner: sources => engine.createScanner(sources),
				createOnigString: s => engine.createString(s)
			},
			loadGrammar: scopeName =>
				scopeName === arkGrammar.scopeName ?
					arkGrammar
				:	(byScope.get(scopeName) ?? null),
			// VS Code's TMGrammarFactory: a grammar injected into `a.b` also
			// applies to `a.b.c`, so every prefix of the scope is looked up
			getInjections: scopeName => {
				const parts = scopeName.split(".")
				return parts.flatMap(
					(_, i) => injections.get(parts.slice(0, i + 1).join(".")) ?? []
				)
			}
		})
		const grammar = await registry.loadGrammar(host.scopeName)
		if (!grammar) throw new Error(`Couldn't load ${host.scopeName}`)
		grammarCache.set(ext, grammar)
		return grammar
	}

	// load eagerly so tokenizing stays synchronous
	for (const ext of Object.keys(hosts)) await grammarFor(ext)

	return (source, ext) => {
		const grammar = grammarCache.get(ext)
		if (!grammar) throw new Error(`No TextMate host for .${ext}`)
		let state: StateStack = INITIAL
		return source.split("\n").map((text, line) => {
			const result = grammar.tokenizeLine(text, state)
			state = result.ruleStack
			return result.tokens.map(t => ({
				line,
				start: t.startIndex,
				end: Math.min(t.endIndex, text.length),
				scopes: t.scopes
			}))
		})
	}
}
