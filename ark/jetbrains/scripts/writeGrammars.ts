import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

// Writes every TextMate grammar the plugin tokenizes with into one directory,
// so the IDE runs exactly the grammars VS Code does:
// - `ark/extension/injected.tmLanguage.json`, read from the extension itself,
//   injected into the scopes its package.json `injectTo` names
// - the host grammars (TypeScript, Vue, Markdown...) from the same
//   `@shikijs/langs` version the editor conformance oracle tokenizes with
//
// Gradle runs this before processing the core module's resources:
// node ./scripts/writeGrammars.ts <outDir>

const extensionDir = new URL("../../extension/", import.meta.url)

type Host = {
	/** the @shikijs/langs bundle the host's grammar comes from */
	bundle: string
	/** the TextMate scope VS Code tokenizes a file of this kind with */
	scopeName: string
}

/** each file extension, keyed to the host VS Code opens it with */
const hosts: Record<string, Host> = {
	ts: { bundle: "typescript", scopeName: "source.ts" },
	mts: { bundle: "typescript", scopeName: "source.ts" },
	cts: { bundle: "typescript", scopeName: "source.ts" },
	tsx: { bundle: "tsx", scopeName: "source.tsx" },
	js: { bundle: "javascript", scopeName: "source.js" },
	mjs: { bundle: "javascript", scopeName: "source.js" },
	cjs: { bundle: "javascript", scopeName: "source.js" },
	jsx: { bundle: "jsx", scopeName: "source.js.jsx" },
	mdx: { bundle: "mdx", scopeName: "source.mdx" },
	svelte: { bundle: "svelte", scopeName: "source.svelte" },
	vue: { bundle: "vue", scopeName: "text.html.vue" },
	astro: { bundle: "astro", scopeName: "source.astro" },
	md: { bundle: "markdown", scopeName: "text.html.markdown" },
	markdown: { bundle: "markdown", scopeName: "text.html.markdown" }
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

type RawGrammar = {
	scopeName: string
	injectTo?: string[]
	[k: string]: unknown
}

type IndexedHost = {
	scopeName: string
	/**
	 * target scope to the injection grammars registered for it: those the
	 * host's own bundle declares, as the extension providing it would, then
	 * ArkType's
	 */
	injections: Record<string, string[]>
}

type GrammarIndex = {
	/** scope name to the file holding its grammar */
	grammars: Record<string, string>
	/** file extension to the host VS Code tokenizes it as */
	hosts: Record<string, IndexedHost>
}

const outDir = resolve(process.argv[2] ?? "build/generated/grammars")
const grammarDir = join(outDir, "io/arktype/jetbrains/grammars")
rmSync(grammarDir, { recursive: true, force: true })
mkdirSync(grammarDir, { recursive: true })

const index: GrammarIndex = { grammars: {}, hosts: {} }

const writeGrammar = (grammar: RawGrammar) => {
	if (index.grammars[grammar.scopeName]) return
	const file = `${grammar.scopeName}.json`
	index.grammars[grammar.scopeName] = file
	writeFileSync(join(grammarDir, file), JSON.stringify(grammar))
}

const grammarsByBundle = new Map<string, RawGrammar[]>()
for (const bundle of bundles) {
	const grammars: RawGrammar[] = (await import(`@shikijs/langs/${bundle}`))
		.default
	grammarsByBundle.set(bundle, grammars)
	for (const grammar of grammars) writeGrammar(grammar)
}

const ark: RawGrammar = JSON.parse(
	readFileSync(new URL("injected.tmLanguage.json", extensionDir), "utf8")
)
writeGrammar(ark)
const arkInjectTo: string[] = JSON.parse(
	readFileSync(new URL("package.json", extensionDir), "utf8")
).contributes.grammars[0].injectTo

for (const [ext, host] of Object.entries(hosts)) {
	const injections: Record<string, string[]> = {}
	const addInjection = (target: string, scopeName: string) => {
		const existing = (injections[target] ??= [])
		if (!existing.includes(scopeName)) existing.push(scopeName)
	}
	for (const grammar of grammarsByBundle.get(host.bundle)!) {
		for (const target of grammar.injectTo ?? [])
			addInjection(target, grammar.scopeName)
	}
	for (const target of arkInjectTo) addInjection(target, ark.scopeName)
	index.hosts[ext] = { scopeName: host.scopeName, injections }
}

writeFileSync(join(grammarDir, "index.json"), JSON.stringify(index, null, "\t"))

console.log(
	`Wrote ${Object.keys(index.grammars).length} grammars to ${grammarDir}`
)
