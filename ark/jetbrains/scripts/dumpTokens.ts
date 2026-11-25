import { createOnigurumaEngine } from "@shikijs/engine-oniguruma"
import {
	INITIAL,
	Registry,
	type IGrammar,
	type IRawGrammar,
	type StateStack
} from "@shikijs/vscode-textmate"
import { closeSync, openSync, readFileSync, writeSync } from "node:fs"
import { join } from "node:path"

// Tokenizes files with the oracle the editor conformance suite uses
// (@shikijs/vscode-textmate on Oniguruma), set up like its `createTokenizer`
// but from the grammars and hosts scripts/writeGrammars.ts wrote, so the
// Kotlin engine (DumpTokens.kt) and this script tokenize identical inputs.
// Writes the same JSON lines DumpTokens.kt does.
//
// node ./scripts/dumpTokens.ts [--out file] [--ark true|false|both]
//   [--grammars dir] [@listFile] files...

export const defaultGrammarDir = new URL(
	"../core/build/generated/grammars/io/arktype/jetbrains/grammars/",
	import.meta.url
).pathname

export const arkInjectionScope = "source.arktype.injection.ts"

type GrammarIndex = {
	grammars: Record<string, string>
	hosts: Record<
		string,
		{ scopeName: string; injections: Record<string, string[]> }
	>
}

export type DumpedFile = {
	path: string
	ark: boolean
	/** each distinct scope list once */
	scopes?: string[][]
	/** each line's tokens as [start, end, index into scopes] */
	lines?: [number, number, number][][]
	error?: string
}

export type Tokenize = (
	source: string,
	ext: string,
	ark: boolean
) => { start: number; end: number; scopes: string[] }[][]

export const createOracle = async (grammarDir: string): Promise<Tokenize> => {
	const engine = await createOnigurumaEngine(
		import("@shikijs/engine-oniguruma/wasm-inlined")
	)
	const index: GrammarIndex = JSON.parse(
		readFileSync(join(grammarDir, "index.json"), "utf8")
	)
	const raw = new Map<string, IRawGrammar>()
	const loadGrammar = (scopeName: string): IRawGrammar | null => {
		const file = index.grammars[scopeName]
		if (!file) return null
		let grammar = raw.get(scopeName)
		if (!grammar) {
			grammar = JSON.parse(readFileSync(join(grammarDir, file), "utf8"))
			raw.set(scopeName, grammar!)
		}
		return grammar!
	}
	const grammars = new Map<string, IGrammar>()
	const grammarFor = async (ext: string, ark: boolean) => {
		const key = `${ext}:${ark}`
		const cached = grammars.get(key)
		if (cached) return cached
		const host = index.hosts[ext]
		if (!host) throw new Error(`No TextMate host for .${ext}`)
		const injections = new Map(
			Object.entries(host.injections).map(([target, scopes]) => [
				target,
				ark ? scopes : scopes.filter(s => s !== arkInjectionScope)
			])
		)
		const registry = new Registry({
			onigLib: {
				createOnigScanner: sources => engine.createScanner(sources),
				createOnigString: s => engine.createString(s)
			},
			loadGrammar,
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
		grammars.set(key, grammar)
		return grammar
	}
	for (const ext of Object.keys(index.hosts)) {
		await grammarFor(ext, true)
		await grammarFor(ext, false)
	}
	return (source, ext, ark) => {
		const grammar = grammars.get(`${ext}:${ark}`)
		if (!grammar) throw new Error(`No TextMate host for .${ext}`)
		let state: StateStack = INITIAL
		return source.split("\n").map(text => {
			const result = grammar.tokenizeLine(text, state)
			state = result.ruleStack
			return result.tokens.map(t => ({
				start: t.startIndex,
				end: Math.min(t.endIndex, text.length),
				scopes: t.scopes
			}))
		})
	}
}

export const dumpFile = (
	tokenize: Tokenize,
	path: string,
	ark: boolean
): DumpedFile => {
	const ext = path.slice(path.lastIndexOf(".") + 1)
	try {
		const tokens = tokenize(readFileSync(path, "utf8"), ext, ark)
		const scopeIndex = new Map<string, number>()
		const scopes: string[][] = []
		const lines = tokens.map(line =>
			line.map((t): [number, number, number] => {
				const key = JSON.stringify(t.scopes)
				let i = scopeIndex.get(key)
				if (i === undefined) {
					i = scopes.length
					scopeIndex.set(key, i)
					scopes.push(t.scopes)
				}
				return [t.start, t.end, i]
			})
		)
		return { path, ark, scopes, lines }
	} catch (e) {
		return { path, ark, error: String(e) }
	}
}

export const parseVariants = (value: string | undefined): boolean[] =>
	value === "both" ? [true, false]
	: value === "false" ? [false]
	: [true]

if (import.meta.main) {
	const args = process.argv.slice(2)
	let out: string | undefined
	let variants = [true]
	let grammarDir = defaultGrammarDir
	const paths: string[] = []
	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (arg === "--out") out = args[++i]
		else if (arg === "--ark") variants = parseVariants(args[++i])
		else if (arg === "--grammars") grammarDir = args[++i]
		else if (arg.startsWith("@")) {
			paths.push(
				...readFileSync(arg.slice(1), "utf8")
					.split("\n")
					.filter(line => line.trim())
			)
		} else paths.push(arg)
	}
	const tokenize = await createOracle(grammarDir)
	const fd = out ? openSync(out, "w") : 1
	for (const path of paths) {
		for (const ark of variants)
			writeSync(fd, `${JSON.stringify(dumpFile(tokenize, path, ark))}\n`)
	}
	if (out) closeSync(fd)
}
