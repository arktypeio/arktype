import { editsBetween, hasOwn } from "@ark/util"
import type { Optimization } from "arktype/internal/standalone.ts"
import { readdirSync, realpathSync, statSync } from "node:fs"
import { isAbsolute, join, relative, resolve, sep } from "node:path"
import type { Node, Span } from "oxc-parser"
import type { SourceModule } from "./module.ts"

/** how a build writes a validator: the options that can differ between two of one build */
export interface Strategy {
	/** "size" writes the validator smaller and slower */
	optimize?: Optimization | undefined
}

export interface StrategyOptions {
	/** strategies by name, beside "fastest" and "smallest" */
	strategies?: Record<string, Strategy> | undefined
	/** the strategy each module, glob or `module#declaration` is written with */
	schemas?: Record<string, string> | undefined
}

// what every validator can be written as, so nothing needs defining to choose
export const builtinStrategies = {
	fastest: { optimize: "speed" },
	smallest: { optimize: "size" }
} as const satisfies Record<string, Strategy>

export type BuiltinStrategy = keyof typeof builtinStrategies

const isBuiltin = (name: string): name is BuiltinStrategy =>
	hasOwn(builtinStrategies, name)

export const strategyMarker = "@ark-strategy"

const apartSpecifier = /^~arktype\/(speed|size)\//

/**
 * what names the shared modules of validators a build optimizes unlike its
 * own, or "" for a module of the build's own: e.g. "size" for
 * `~arktype/size/intersection1a2b3c`
 */
export const strategyOfSpecifier = (specifier: string): string =>
	apartSpecifier.exec(specifier)?.[1] ?? ""

export interface SchemaKey {
	// as the options write it, its path relative to cwd
	key: string
	// the path or glob it names modules by, with forward slashes
	pattern: string
	// e.g. `Money` for `money.ts#Money`: a declaration of the module it names
	declaration: string | undefined
	strategy: string
	isGlob: boolean
	matches: (path: string) => boolean
	// how much of a module's path it names: all of it, or what precedes its
	// first wildcard, so the longer of two paths or of two globs matching one
	// module chooses
	specificity: number
}

/** the strategy a definition is written with, and what chose it */
export interface ResolvedStrategy {
	// undefined for the build's own optimize, which no key or marker chose
	name: string | undefined
	optimize: Optimization
	// the key or marker that chose it
	by: string | undefined
	// whether that names the definition itself, as a marker or a key naming
	// its declaration does, rather than each one of its module
	isOwn: boolean
}

// two keys, each as specific as the other, that choose otherwise for a module
export interface KeyConflict {
	keys: [SchemaKey, SchemaKey]
	declaration: string | undefined
}

// a top-level declaration of a module, by each name a key can call it
export interface NamedDeclaration extends Span {
	names: string[]
}

// brackets are no wildcard, so a route like `app/users/[id]/page.tsx` is a
// path as Next and SvelteKit write it
const wildcard = /[*?{}]/

const keyText = (key: string) => `schemas[${JSON.stringify(key)}]`

// `a/b.ts#Money` is `a/b.ts` and `Money`; a path holds no #
const splitKey = (key: string): [pattern: string, declaration?: string] => {
	const at = key.lastIndexOf("#")
	return at === -1 ? [key] : [key.slice(0, at), key.slice(at + 1)]
}

const slashed = (path: string) => path.split(sep).join("/")

// a path as a key names it: relative to cwd where it's under it, without `./`
const normalizedPattern = (
	pattern: string,
	cwd: string | undefined
): string => {
	let path = slashed(pattern)
	while (path.startsWith("./")) path = path.slice(2)
	if (cwd !== undefined && isAbsolute(pattern)) {
		const fromCwd = slashed(relative(cwd, pattern))
		if (!fromCwd.startsWith("../") && !isAbsolute(fromCwd)) path = fromCwd
	}
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path
}

// **, * and ? as a shell reads them, and {a,b} for either
const globSource = (glob: string): string => {
	let source = ""
	let braces = 0
	for (let i = 0; i < glob.length; i++) {
		const char = glob[i]
		if (char === "*") {
			if (glob[i + 1] !== "*") source += "[^/]*"
			else if (glob[i + 2] === "/") {
				// `a/**/b` is `a/b` too
				source += "(?:.*/)?"
				i += 2
			} else {
				source += ".*"
				i++
			}
		} else if (char === "?") source += "[^/]"
		else if (char === "{") {
			source += "(?:"
			braces++
		} else if (char === "}" && braces) {
			source += ")"
			braces--
		} else if (char === "," && braces) source += "|"
		else source += char.replace(/[$()+.[\\\]^|]/g, "\\$&")
	}
	return source + ")".repeat(braces)
}

const parseKey = (
	key: string,
	strategy: string,
	cwd: string | undefined
): SchemaKey => {
	const [written, declaration] = splitKey(key)
	const pattern = normalizedPattern(written, cwd)
	const isGlob = wildcard.test(pattern)
	const matcher = new RegExp(
		// a directory stands for the modules it holds, as it does to --check
		isGlob ? `^${globSource(pattern)}$` : `^${globSource(pattern)}(?:/.*)?$`
	)
	return {
		key: declaration === undefined ? pattern : `${pattern}#${declaration}`,
		pattern,
		declaration,
		strategy,
		isGlob,
		matches: path => matcher.test(path),
		specificity: isGlob ? pattern.search(wildcard) : pattern.length
	}
}

// a path chooses over any glob, then the key naming more of the path: of
// two paths matching one module, one is the other's directory
const bySpecificity = (l: SchemaKey, r: SchemaKey): number =>
	Number(l.isGlob) - Number(r.isGlob) || r.specificity - l.specificity

/** keys as the build compares them, so one set in ark.json and again in a call is one key */
export const normalizedSchemas = (
	schemas: Record<string, string>,
	// what a relative key is written against, if not cwd
	dir: string | undefined,
	cwd: string
): Record<string, string> => {
	const normalized: Record<string, string> = {}
	for (const key in schemas) {
		const [pattern, declaration] = splitKey(key)
		const path = normalizedPattern(
			dir === undefined || isAbsolute(pattern) ?
				pattern
			:	resolve(dir, pattern),
			cwd
		)
		normalized[declaration === undefined ? path : `${path}#${declaration}`] =
			schemas[key]
	}
	return normalized
}

/** fails where an option names a strategy that isn't one, or a key names nothing */
export const checkStrategyOptions = ({
	strategies = {},
	schemas = {}
}: StrategyOptions): void => {
	for (const name in strategies)
		if (isBuiltin(name)) throw new Error(writeBuiltinStrategyMessage(name))
	const names = [...Object.keys(builtinStrategies), ...Object.keys(strategies)]
	for (const key in schemas) {
		const [pattern, declaration] = splitKey(key)
		if (!pattern || declaration === "")
			throw new Error(writeMalformedKeyMessage(key))
		if (!names.includes(schemas[key])) {
			throw new Error(
				writeUnknownStrategyMessage(keyText(key), schemas[key], names)
			)
		}
	}
}

// the name a mistyped one is nearest to, within two edits
export const nearestTo = (
	name: string,
	candidates: Iterable<string>
): string | undefined => {
	let nearest: string | undefined
	let fewest = 3
	for (const candidate of candidates) {
		const edits = editsBetween(name.toLowerCase(), candidate.toLowerCase())
		if (edits < fewest) [nearest, fewest] = [candidate, edits]
	}
	return nearest
}

const quotedList = (names: readonly string[]): string => {
	const quoted = names.map(name => JSON.stringify(name))
	return quoted.length < 2 ?
			quoted.join("")
		:	`${quoted.slice(0, -1).join(", ")} or ${quoted[quoted.length - 1]}`
}

export const writeUnknownStrategyMessage = (
	// what names it, as a key's text or a marker's
	by: string,
	name: string,
	names: readonly string[]
): string => {
	const nearest = nearestTo(name, names)
	return `${by} names the strategy ${JSON.stringify(name)}, which isn't one.${nearest ? ` Did you mean ${JSON.stringify(nearest)}?` : ""} A strategy is ${quotedList(names.filter(isBuiltin))}, or one strategies defines${names.some(known => !isBuiltin(known)) ? `, here ${quotedList(names.filter(known => !isBuiltin(known)))}` : ""}.`
}

export const writeBuiltinStrategyMessage = (name: BuiltinStrategy): string =>
	`strategies defines ${JSON.stringify(name)}, which every build has as { ${Object.entries(
		builtinStrategies[name]
	)
		.map(([option, value]) => `${option}: ${JSON.stringify(value)}`)
		.join(", ")} }. Give yours another name.`

export const writeMalformedKeyMessage = (key: string): string =>
	`${keyText(key)} must name a module, as "src/money.ts" or "src/server/**", and may name one of its declarations after a #, as "src/money.ts#Money".`

export const writeUnmatchedKeyMessage = (
	key: string,
	cwd: string,
	nearest: string | undefined
): string =>
	`${keyText(key)} matches no file from ${cwd}, so it would choose for nothing.${nearest ? ` Did you mean ${JSON.stringify(nearest)}?` : ""}`

export const writeUnnamedDeclarationMessage = (
	key: SchemaKey,
	nearest: string | undefined
): string =>
	`${keyText(key.key)} names ${key.declaration}, which declares no definition here${nearest ? `. Did you mean ${JSON.stringify(`${key.pattern}#${nearest}`)}?` : ""}`

export const unnamedDeclarationHint =
	"A key names a declaration at its module's top level, as \"src/money.ts#Money\" does `export const Money = type(...)`, by its own name or the one it's exported under."

export const writeKeyConflictMessage = (
	{ keys: [l, r], declaration }: KeyConflict,
	path: string
): string =>
	`${keyText(l.key)} and ${keyText(r.key)} both match ${declaration === undefined ? path : `${declaration} in ${path}`}, as ${JSON.stringify(l.strategy)} and ${JSON.stringify(r.strategy)}, and neither names more of its path`

export const keyConflictHint =
	"A key naming a declaration chooses over one naming its module, a path over a glob, and of two globs the one with more of the path before its first wildcard. Name the module in a key of its own, or write more of its path in one of them."

export const writeIslandStrategyMessage = (by: string): string =>
	`${by} chooses a strategy for a definition // @ark-runtime leaves to arktype, which the build doesn't write`

export const islandStrategyHint =
	"Remove one of them: a strategy is how the build writes a validator, and an island's Type is created by arktype as the program runs."

export const strayStrategyMarkerMessage = `\`// ${strategyMarker}\` marks no definition`

export const strategyMarkerHint = `Write \`// ${strategyMarker} <name>\` on the line before a statement holding a definition, as before \`export const Money = type(...)\`.`

// what a marker reads as, e.g. `fastest` of `// @ark-strategy fastest`, or
// of `// @ark-strategy fastest // hot path`: a reason follows a second //,
// as a name of more than one word stays one, so a misspelling still fails
export const markedStrategyOf = (comment: string): string | undefined => {
	const [marker, ...rest] = comment.split("//", 1)[0].trim().split(/\s+/)
	return marker === strategyMarker ? rest.join(" ") : undefined
}

const scriptFile = /\.(?:[cm]?[jt]s|[jt]sx|svelte|vue|astro|mdx)$/

const skippedDir = /^(?:node_modules|\.git)$/

// each file a key could choose for, read no further than the directory its
// pattern names before its first wildcard
function* filesMatching(key: SchemaKey, cwd: string): Generator<string> {
	let base: string
	if (key.isGlob) {
		const literal = key.pattern.slice(0, key.specificity)
		base = literal.slice(0, literal.lastIndexOf("/") + 1)
	} else {
		const stats = statSync(resolve(cwd, key.pattern), { throwIfNoEntry: false })
		if (!stats) return
		if (!stats.isDirectory()) return yield resolve(cwd, key.pattern)
		base = `${key.pattern}/`
	}
	// a pattern entering node_modules names what it holds
	const skips = (name: string) =>
		skippedDir.test(name) && !key.pattern.includes(name)
	const pending = [base]
	for (const dir of pending) {
		let entries
		try {
			entries = readdirSync(resolve(cwd, dir), { withFileTypes: true })
		} catch {
			continue
		}
		for (const entry of entries) {
			const path = dir + entry.name
			if (entry.isDirectory()) {
				if (!skips(entry.name)) pending.push(`${path}/`)
			} else if (scriptFile.test(entry.name) && key.matches(path))
				yield resolve(cwd, path)
		}
	}
}

export const writeDefinitionlessKeyMessage = (
	key: string,
	files: readonly string[]
): string =>
	`${keyText(key)} matches ${files.length === 1 ? `${files[0]}, which holds no definition` : `${files.length} files, none of which holds a definition`}, so it chooses for nothing. Name the modules that define the Types it's for, or remove it.`

// the key with the first of its path's names that isn't there as the nearest that is
const nearestKeyTo = (key: SchemaKey, cwd: string): string | undefined => {
	const names = (
		key.isGlob ?
			key.pattern.slice(0, key.specificity)
		:	key.pattern).split("/")
	// a glob's last name before its wildcard may be part of one, as `a` in `a*`
	if (key.isGlob) names.pop()
	let dir = isAbsolute(key.pattern) ? "/" : cwd
	for (const [i, name] of names.entries()) {
		if (!name) continue
		const next = join(dir, name)
		if (statSync(next, { throwIfNoEntry: false })) {
			dir = next
			continue
		}
		let entries: string[]
		try {
			entries = readdirSync(dir)
		} catch {
			return
		}
		const nearest = nearestTo(name, entries)
		if (nearest === undefined) return
		const rest = key.pattern.split("/")
		rest[i] = nearest
		return `${rest.join("/")}${key.declaration === undefined ? "" : `#${key.declaration}`}`
	}
}

/** a build's strategies, and which each of its definitions is written with */
export class SchemaStrategies {
	readonly keys: SchemaKey[]
	private strategies: Record<string, Strategy>
	private cwd: string | undefined
	private byPath: Record<string, SchemaKey[]> = Object.create(null)
	// what a definition no key or marker chooses for is written for
	readonly defaultOptimize: Optimization

	constructor(
		{ strategies = {}, schemas = {} }: StrategyOptions,
		defaultOptimize: Optimization,
		cwd: string | undefined
	) {
		this.defaultOptimize = defaultOptimize
		this.cwd = cwd
		this.strategies = { ...builtinStrategies, ...strategies }
		this.keys = Object.keys(schemas).map(key =>
			parseKey(key, schemas[key], cwd)
		)
	}

	get names(): string[] {
		return Object.keys(this.strategies)
	}

	// whether a marker names it, as an option's value was checked to
	has(name: string): boolean {
		return hasOwn(this.strategies, name)
	}

	get default(): ResolvedStrategy {
		return {
			name: undefined,
			optimize: this.defaultOptimize,
			by: undefined,
			isOwn: false
		}
	}

	private resolved(name: string, by: string, isOwn: boolean): ResolvedStrategy {
		return {
			name,
			optimize: this.strategies[name].optimize ?? this.defaultOptimize,
			by,
			isOwn
		}
	}

	// a path as keys name it: from cwd, or whole where it's elsewhere
	private pathOf(id: string): string[] {
		let file = id.replace(/[#?].*$/, "")
		if (this.cwd === undefined) return [slashed(file)]
		let fromCwd = relative(this.cwd, file)
		// e.g. an id through a symlink to cwd, which is its real path
		if (fromCwd.startsWith("..")) {
			try {
				file = realpathSync(file)
				fromCwd = relative(this.cwd, file)
			} catch {
				// one that's no file, like a virtual module's, is named as it is
			}
		}
		return isAbsolute(fromCwd) ?
				[slashed(file)]
			:	[slashed(fromCwd), slashed(file)]
	}

	/** each key matching a module, the most specific first */
	keysOf(id: string): SchemaKey[] {
		if (!this.keys.length) return this.keys
		let matching = this.byPath[id]
		if (!matching) {
			const paths = this.pathOf(id)
			matching = this.byPath[id] = this.keys
				.filter(key => paths.some(path => key.matches(path)))
				.sort(bySpecificity)
		}
		return matching
	}

	/**
	 * what chooses for a definition in a declaration of those names, or in
	 * none: the key naming the declaration, else its marker, else the key
	 * naming the module
	 */
	strategyOf(
		id: string,
		declared: readonly string[],
		marked: string | undefined
	): ResolvedStrategy | KeyConflict {
		const keys = this.keysOf(id)
		const named = keys.filter(
			key => key.declaration !== undefined && declared.includes(key.declaration)
		)
		if (named.length) return this.chosenAmong(named)
		if (marked !== undefined)
			return this.resolved(marked, `// ${strategyMarker} ${marked}`, true)
		const unnamed = keys.filter(key => key.declaration === undefined)
		return unnamed.length ? this.chosenAmong(unnamed) : this.default
	}

	// the most specific of the keys naming one thing, unless another as
	// specific chooses otherwise
	private chosenAmong(keys: SchemaKey[]): ResolvedStrategy | KeyConflict {
		const [first] = keys
		const tied = keys.find(
			key =>
				bySpecificity(key, first) === 0 &&
				this.strategies[key.strategy].optimize !==
					this.strategies[first.strategy].optimize
		)
		return tied ?
				{ keys: [first, tied], declaration: first.declaration }
			:	this.resolved(
					first.strategy,
					keyText(first.key),
					first.declaration !== undefined
				)
	}

	/**
	 * fails where a key matches no file, as a mistyped one would otherwise
	 * choose for nothing
	 */
	checkFiles(): void {
		if (this.cwd === undefined) return
		for (const key of this.keys) {
			if (!filesMatching(key, this.cwd).next().done) continue
			throw new Error(
				writeUnmatchedKeyMessage(key.key, this.cwd, nearestKeyTo(key, this.cwd))
			)
		}
	}

	/**
	 * each key that chooses for nothing among the files a check read: one
	 * matching no file but those, none of which a key naming it found a
	 * definition in
	 */
	definitionlessIn(
		checked: ReadonlySet<string>,
		// the keys choosing for a definition of some file
		choosing: ReadonlySet<string>
	): string[] {
		const { cwd } = this
		if (cwd === undefined) return []
		return this.keys.flatMap(key => {
			if (choosing.has(key.key)) return []
			const files = [...filesMatching(key, cwd)]
			return files.length && files.every(file => checked.has(file)) ?
					writeDefinitionlessKeyMessage(
						key.key,
						files.map(file => slashed(relative(cwd, file)))
					)
				:	[]
		})
	}
}

export const isKeyConflict = (
	resolved: ResolvedStrategy | KeyConflict
): resolved is KeyConflict => "keys" in resolved

// what --check prints after a site, e.g. `fastest by schemas["src/server/**"]`
export const writeStrategyLabel = (
	{ name, optimize, by }: ResolvedStrategy,
	// what it's written for, which another definition of its Type may decide
	written: Optimization
): string =>
	`${
		name === undefined ?
			`optimize: ${JSON.stringify(optimize)}`
		:	`${name} by ${by}`
	}${written === optimize ? "" : `, written for ${written} as another definition of its Type is`}`

const namesOf = (module: SourceModule, local: string): string[] => [
	...new Set([
		local,
		...(module.scopes.root.bindings[local]?.exportNames ?? [])
	])
]

/** each declaration at a module's top level a key can name */
export const declarationsOf = (module: SourceModule): NamedDeclaration[] => {
	const result: NamedDeclaration[] = []
	for (const statement of module.program.body) {
		if (statement.type === "ExportDefaultDeclaration") {
			const { declaration } = statement
			const id = "id" in declaration ? (declaration.id as Node | null) : null
			result.push({
				start: statement.start,
				end: statement.end,
				names: [
					...new Set([
						"default",
						...(id?.type === "Identifier" ? namesOf(module, id.name) : [])
					])
				]
			})
			continue
		}
		const declaration =
			statement.type === "ExportNamedDeclaration" ?
				statement.declaration
			:	statement
		if (!declaration) continue
		if (declaration.type === "VariableDeclaration") {
			for (const declarator of declaration.declarations) {
				if (declarator.id.type !== "Identifier") continue
				result.push({
					start: declarator.start,
					end: declarator.end,
					names: namesOf(module, declarator.id.name)
				})
			}
		} else if (
			(declaration.type === "FunctionDeclaration" ||
				declaration.type === "ClassDeclaration") &&
			declaration.id
		) {
			result.push({
				start: declaration.start,
				end: declaration.end,
				names: namesOf(module, declaration.id.name)
			})
		}
	}
	return result
}
