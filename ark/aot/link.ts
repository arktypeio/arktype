import { hashOf } from "arktype/util"
import MagicString, { type SourceMap } from "magic-string"
import type { MemberExpression, Node, Span } from "oxc-parser"
import { SourceModule } from "./module.ts"
import { writeImportsAhead } from "./output.ts"
import {
	exportNameOf,
	isWriteTarget,
	walk,
	type Binding,
	type Reference
} from "./scope.ts"

export interface LinkedSite {
	source: string
	code: string
}

export interface LinkedBundle {
	sites: Record<string, LinkedCode>
	modules: Record<string, string>
	// units that would be declared as their site's validator, were validators to expose allows
	unexposed: number
}

export interface LinkedCode {
	code: string
	map: SourceMap | undefined
}

export interface LinkOptions {
	exposesAllows?: boolean
	// the bundle is one chunk, so its units may be one module
	isOneChunk?: boolean
	// its units are checkers, so what they call may be shared
	sharesChecks?: boolean
	// its validators are created from checkers, by functions much alike
	sharesCreators?: boolean
	// its chunks are many, so the units most of its modules read are one module
	sharesUnits?: boolean
}

interface LinkPass {
	// the last pass, which links units into the sites reading them
	intoSites: boolean
	exposesAllows?: boolean
	// declares each validator its units can, not only those they read
	declaresEach?: boolean
}

// writes each checker read once where it's read; changed modules are renamed and the originals kept
export const linkBundle = (
	sites: Record<string, LinkedSite>,
	modules: Record<string, string>,
	{
		exposesAllows = false,
		isOneChunk = false,
		sharesChecks = false,
		sharesCreators = false,
		sharesUnits = false
	}: LinkOptions = {}
): LinkedBundle | undefined => {
	const created = sharesCreators ? withOneCreator(modules) : modules
	let codes = sharesChecks ? withSharedChecks(created) : created
	const siteCodes = Object.fromEntries(
		Object.entries(sites).map(([id, site]) => [id, site.code])
	)
	// units into units until none is read once by another, then into sites
	for (let pass = 0; pass < maxPasses; pass++) {
		const linker = new Linker(codes, siteCodes, sites)
		if (!linker.link({ intoSites: false })) break
		codes = linker.codes()
	}
	const linker = new Linker(codes, siteCodes, sites)
	// sharing reads what's linked, where what each site creates is already declared
	linker.link({
		intoSites: true,
		exposesAllows,
		declaresEach: isOneChunk && !sharesChecks
	})
	codes = linker.codes()
	const one = isOneChunk ? oneModuleOf(codes, linker.siteTexts()) : undefined
	const shared =
		sharesUnits && !one ? sharedModulesOf(codes, linker.siteTexts()) : undefined
	if (shared) codes = shared.codes
	const originals = shared ? { ...modules, ...shared.modules } : modules
	let renamed = one?.renamed
	if (!renamed && sharesUnits) {
		const read = withoutUnread(
			codes,
			linker.siteTexts(),
			shared?.declaredIn ?? {}
		)
		// units reading each other in a cycle can't be renamed once one changes
		renamed = renamedOf(read, originals)
		if (renamed) codes = read
	}
	renamed ??= renamedOf(codes, originals)
	if (!renamed) return
	// a site reads what a module declares from it, under whatever it's named
	for (const specifier in shared?.declaredIn) {
		const module = shared!.declaredIn[specifier]
		renamed[specifier] = renamed[module] ?? module
	}
	const linked: LinkedBundle = {
		sites: {},
		modules: {},
		unexposed: linker.unexposed
	}
	if (one) codes = { [one.specifier]: one.code }
	for (const specifier in codes) {
		linked.modules[renamed[specifier] ?? specifier] = withRenamed(
			codes[specifier],
			renamed
		)
	}
	for (const [id, site] of linker.sites(renamed)) linked.sites[id] = site
	return linked
}

const maxPasses = 8

interface OneModule {
	specifier: string
	code: string
	renamed: Record<string, string>
}

interface Declared {
	text: string
	// what it reads of the units, and whether eagerly rather than in a function
	reads: [name: string, isEager: boolean][]
}

interface Declarations {
	declared: Map<string, Declared>
	// each import of another package by its local name
	imported: Map<string, string>
	// statements run for their effect, like one reading the runtime's version
	statements: Set<string>
	// each name a unit exports, declared or imported
	exported: Set<string>
}

// one module of what the sites read, each after what it reads; a unit must
// declare or import what it reads by its export name
const oneModuleOf = (
	codes: Record<string, string>,
	siteTexts: string[]
): OneModule | undefined => {
	const declarations = declarationsOf(codes)
	if (!declarations) return
	const { declared, imported, statements } = declarations
	const order: string[] = []
	const states = new Map<string, "visiting" | "done">()
	// each declaration after what it reads eagerly
	const visit = (name: string): "done" | "cycle" | undefined => {
		const declaration = declared.get(name)
		if (!declaration) return imported.has(name) ? "done" : undefined
		const state = states.get(name)
		if (state) return state === "done" ? "done" : "cycle"
		states.set(name, "visiting")
		for (const [read, isEager] of declaration.reads) {
			const visited = visit(read)
			if (!visited || (visited === "cycle" && isEager)) return
		}
		states.set(name, "done")
		order.push(name)
		return "done"
	}
	const renamed: Record<string, string> = {}
	const exported: string[] = []
	for (const text of siteTexts) {
		for (const match of text.matchAll(siteImport)) {
			const [, names, specifier] = match
			if (!(specifier in codes)) continue
			renamed[specifier] = ""
			for (const name of names.split(",")) {
				const [read] = name.trim().split(/\s+as\s+/)
				if (!declared.has(read) || visit(read) !== "done") return
				if (!exported.includes(read)) exported.push(read)
			}
		}
	}
	// a site reading a unit other than by a named import would read nothing
	for (const text of siteTexts) {
		for (const [, specifier] of text.matchAll(virtualSource))
			if (specifier in codes && !(specifier in renamed)) return
	}
	const code = [
		...imported.values(),
		...statements,
		...order.map(name => declared.get(name)!.text),
		`export { ${exported.join(", ")} }`
	].join("\n")
	const specifier = `~arktype/${hashOf(code)}`
	for (const imported in renamed) renamed[imported] = specifier
	return { specifier, code, renamed }
}

interface SharedModules {
	// each module declaring units, by its specifier
	modules: Record<string, string>
	// the module declaring each unit one does
	declaredIn: Record<string, string>
	// the rest, reading them, and them
	codes: Record<string, string>
}

// a bundler that splits a bundle into chunks copies a module too small for a
// chunk of its own into each chunk reading it, as webpack and Rspack do, and
// what most validators read is a few small units: what creates one, a check
// like a string's of some length. Declared in one module, they're copied where
// the runtime they read is, which a chunk the others load already holds. This
// many readers repay naming it in each
const minCommonReaders = 8

// the units enough others read as one module, with what those read, and each
// set of units the same sites reach as one: a bundler writes a module two
// others read apart from both, with a wrapper and a read of it in each, which
// units always loaded together needn't each pay. Undefined where no two share
// a module
const sharedModulesOf = (
	codes: Record<string, string>,
	siteTexts: string[]
): SharedModules | undefined => {
	const readsOf = (code: string) =>
		new Set(
			[...code.matchAll(virtualSource)]
				.map(match => match[1])
				.filter(specifier => specifier in codes)
		)
	const readers: Record<string, number> = {}
	for (const code of [...Object.values(codes), ...siteTexts])
		for (const read of readsOf(code)) readers[read] = (readers[read] ?? 0) + 1
	// a unit declaring a function, as a cell does its setter, stays its own
	const declarable = new Map<string, boolean>()
	const isDeclarable = (specifier: string): boolean => {
		let result = declarable.get(specifier)
		if (result === undefined) {
			result = !!declarationsOf({ [specifier]: codes[specifier] })
			declarable.set(specifier, result)
		}
		return result
	}
	const linkable = new Map<string, boolean>()
	const isLinkable = (specifier: string): boolean => {
		if (!linkable.has(specifier)) {
			linkable.set(specifier, false)
			linkable.set(
				specifier,
				isDeclarable(specifier) &&
					[...readsOf(codes[specifier])].every(isLinkable)
			)
		}
		return linkable.get(specifier)!
	}
	const common = new Set<string>()
	const declare = (specifier: string) => {
		if (common.has(specifier)) return
		common.add(specifier)
		for (const read of readsOf(codes[specifier])) declare(read)
	}
	for (const specifier in readers) {
		if (readers[specifier] >= minCommonReaders && isLinkable(specifier))
			declare(specifier)
	}
	// each site reaching a unit, through whichever units read it
	const sitesReaching = new Map<string, Set<number>>()
	for (const [i, text] of siteTexts.entries()) {
		const reach = (specifier: string) => {
			let sites = sitesReaching.get(specifier)
			if (!sites) sitesReaching.set(specifier, (sites = new Set()))
			if (sites.has(i)) return
			sites.add(i)
			for (const read of readsOf(codes[specifier])) reach(read)
		}
		for (const read of readsOf(text)) reach(read)
	}
	// what one site alone reaches a bundler writes into it anyway: one module
	// of it is what a call written in two of its units is declared once in
	const bySites = new Map<string, string[]>()
	for (const [specifier, sites] of sitesReaching) {
		if (common.has(specifier) || !isDeclarable(specifier)) continue
		const key = [...sites].sort((l, r) => l - r).join()
		const units = bySites.get(key)
		if (units) units.push(specifier)
		else bySites.set(key, [specifier])
	}
	// a unit reads only what at least its sites reach, so each set after those
	// more sites reach imports modules already named
	const sets = [
		[...common],
		...[...bySites.values()].sort(
			(l, r) => sitesReaching.get(r[0])!.size - sitesReaching.get(l[0])!.size
		)
	]
	const shared: SharedModules = { modules: {}, declaredIn: {}, codes: {} }
	for (const units of sets) {
		if (units.length < 2) continue
		const declarations = declarationsOf(
			Object.fromEntries(
				units.map(unit => [unit, withRenamed(codes[unit], shared.declaredIn)])
			)
		)
		const order =
			declarations && orderOf(declarations, declarations.declared.keys())
		if (!order) continue
		const code = withCallsOnce(
			[
				...declarations.imported.values(),
				...declarations.statements,
				...order.map(name => declarations.declared.get(name)!.text),
				// what each exported, one it only imports among them
				`export { ${[...declarations.exported].join(", ")} }`
			].join("\n")
		)
		const specifier = `~arktype/${hashOf(code)}`
		shared.modules[specifier] = code
		for (const unit of units) shared.declaredIn[unit] = specifier
	}
	if (!Object.keys(shared.modules).length) return
	Object.assign(shared.codes, shared.modules)
	for (const key in codes) {
		if (!(key in shared.declaredIn)) {
			shared.codes[key] = withCallsOnce(
				withRenamed(codes[key], shared.declaredIn)
			)
		}
	}
	return shared
}

const namedImport = /^import { (\S+) as (\S+) } from "([^"]+)"$/

const sideEffectImport = /^import\s*"[^"]+";?$/gm

// A bundler drops a declaration nothing reads, but not all it wrote for one:
// where it held another module's export, the minifier of Next.js keeps a read
// of that export in its place, `ns.name;`, as reading a namespace's member may
// run a getter. A unit declares more than a program reads, like the node of a
// Type only ever called, so each module is written with what the sites reach
// of it alone, through whichever units read it. One that isn't a list of
// declarations, like a cell's, is kept whole, with all it imports
const withoutUnread = (
	codes: Record<string, string>,
	siteTexts: string[],
	declaredIn: Record<string, string>
): Record<string, string> => {
	const parsed = new Map<string, Declarations | undefined>()
	const declarationsIn = (specifier: string) => {
		if (!parsed.has(specifier))
			parsed.set(specifier, declarationsOf({ [specifier]: codes[specifier] }))
		return parsed.get(specifier)
	}
	// each name reached in a module, declared or imported, or true for all
	const reached = new Map<string, Set<string> | true>()
	const reachAll = (specifier: string): void => {
		if (!(specifier in codes) || reached.get(specifier) === true) return
		const declarations = declarationsIn(specifier)
		reached.set(specifier, true)
		if (declarations) {
			for (const name of declarations.imported.keys())
				reachImport(declarations, name)
		} else reachImportsOf(codes[specifier])
	}
	// what a module read as text names of the units: each name it imports, or
	// all of a unit it reads any other way
	const reachImportsOf = (text: string): void => {
		const named = new Map<string, number>()
		for (const [, names, specifier] of text.matchAll(siteImport)) {
			named.set(specifier, (named.get(specifier) ?? 0) + 1)
			for (const name of names.split(",")) {
				const [read] = name.trim().split(/\s+as\s+/)
				if (read) reach(declaredIn[specifier] ?? specifier, read)
			}
		}
		const sources = new Map<string, number>()
		for (const [, specifier] of text.matchAll(virtualSource))
			sources.set(specifier, (sources.get(specifier) ?? 0) + 1)
		for (const [specifier, count] of sources) {
			if (count !== (named.get(specifier) ?? 0))
				reachAll(declaredIn[specifier] ?? specifier)
		}
	}
	const reachImport = (declarations: Declarations, local: string): void => {
		const text = declarations.imported.get(local)!
		const [, name, , from] = namedImport.exec(text) ?? []
		if (from) reach(declaredIn[from] ?? from, name)
		else {
			for (const [, specifier] of text.matchAll(virtualSource))
				reachAll(declaredIn[specifier] ?? specifier)
		}
	}
	const reach = (specifier: string, name: string): void => {
		if (!(specifier in codes)) return
		const known = reached.get(specifier)
		if (known === true || known?.has(name)) return
		const declarations = declarationsIn(specifier)
		if (!declarations) return reachAll(specifier)
		const { declared, imported, statements } = declarations
		const names = known ?? new Set<string>()
		names.add(name)
		if (!known) {
			reached.set(specifier, names)
			// a statement run for its effect keeps what it names
			for (const statement of statements) {
				for (const [read] of statement.matchAll(/[\w$]+/g))
					if (declared.has(read) || imported.has(read)) reach(specifier, read)
			}
		}
		if (imported.has(name)) return reachImport(declarations, name)
		for (const [read] of declared.get(name)?.reads ?? []) reach(specifier, read)
	}
	for (const text of siteTexts) reachImportsOf(text)
	const result: Record<string, string> = {}
	for (const specifier in codes) {
		const names = reached.get(specifier)
		const declarations = declarationsIn(specifier)
		result[specifier] = codes[specifier]
		// one no site reaches is left to the bundler, which drops it whole
		if (!names || names === true || !declarations) continue
		const { declared, imported, statements, exported } = declarations
		if (
			[...declared.keys()].every(name => names.has(name)) &&
			[...exported].every(name => names.has(name))
		)
			continue
		result[specifier] = [
			...(codes[specifier].match(sideEffectImport) ?? []),
			...[...imported].flatMap(([name, text]) => (names.has(name) ? text : [])),
			...statements,
			...[...declared].flatMap(([name, { text }]) =>
				names.has(name) ? text : []
			),
			`export { ${[...exported].filter(name => names.has(name)).join(", ")} }`
		].join("\n")
	}
	return result
}

const pureMarker = "/* @__PURE__ */ "

// A call written twice is shorter declared from about 18 characters, but gzip
// already writes the second as a match, so a name for it only adds to what's
// compressed: the shorter the call, the more. On an app of 128 modules writing
// validators, minified B / gzip B of its units and runtime: none 96743 / 28694;
// from 96 93588 / 28834; 64 93141 / 28871; 48 93151 / 29060; 18 92989 / 29184
const minOnceCall = 64

// The runtime makes the same checker of the same text, and nothing writes to
// one once it's made, so a call a module writes more than once is declared
// once, before the first statement reading it. Each occurrence must read only
// what the module declares or imports, or what the call itself binds, and one
// in a function not called as its statement runs must hold data alone: what
// else it names may not be set until the function's called
const withCallsOnce = (code: string): string => {
	for (let pass = 0; pass < maxPasses; pass++) {
		const module = new SourceModule("once.js", code, "once.js")
		if (module.parseErrors.length) return code
		const { scopes } = module
		const readsOnlyModule = (start: number, end: number) =>
			scopes.references.every(
				({ id, binding }) =>
					id.start < start ||
					id.end > end ||
					!binding ||
					binding.scope === scopes.root ||
					(start <= binding.id.start && binding.id.end <= end)
			)
		const found = new Map<string, [start: number, end: number, at: number][]>()
		for (const statement of module.program.body) {
			if (statement.type === "ImportDeclaration") continue
			walk(statement, node => {
				const start = node.start - pureMarker.length
				if (
					node.type === "CallExpression" &&
					code.startsWith(pureRuntimeCall, start) &&
					node.end - node.start >= minOnceCall
				) {
					const call = code.slice(start, node.end)
					if (
						isDeferred(node, statement) ?
							holdsOnlyData(call)
						:	readsOnlyModule(start, node.end)
					) {
						const calls = found.get(call)
						if (calls) calls.push([start, node.end, statement.start])
						else found.set(call, [[start, node.end, statement.start]])
					}
				}
				return true
			})
		}
		const edits = new MagicString(code)
		const covered: [start: number, end: number][] = []
		// the longest first, as what it holds is then written once with it
		for (const [call, calls] of [...found].sort(
			([l], [r]) => r.length - l.length
		)) {
			const free = calls.filter(
				([start]) => !covered.some(([from, to]) => from <= start && start < to)
			)
			const name = `once${hashOf(call)}`
			if (free.length < 2 || name in scopes.root.bindings) continue
			edits.prependLeft(
				Math.min(...free.map(([, , at]) => at)),
				`const ${name} = ${call}\n`
			)
			for (const [start, end] of free) {
				edits.overwrite(start, end, name)
				covered.push([start, end])
			}
		}
		if (!covered.length) return code
		code = edits.toString()
	}
	return code
}

// each of the names after what it reads as it's declared, or undefined where
// two read each other so
const orderOf = (
	{ declared, imported }: Declarations,
	names: Iterable<string>
): string[] | undefined => {
	const order: string[] = []
	const states = new Map<string, "visiting" | "done">()
	const visit = (name: string): "done" | "cycle" | undefined => {
		const declaration = declared.get(name)
		if (!declaration) return imported.has(name) ? "done" : undefined
		const state = states.get(name)
		if (state) return state === "done" ? "done" : "cycle"
		states.set(name, "visiting")
		for (const [read, isEager] of declaration.reads) {
			const visited = visit(read)
			if (!visited || (visited === "cycle" && isEager)) return
		}
		states.set(name, "done")
		order.push(name)
		return "done"
	}
	for (const name of names) if (visit(name) !== "done") return
	return order
}

// what each unit declares, imports and runs, where every unit is linkable
const declarationsOf = (
	codes: Record<string, string>
): Declarations | undefined => {
	const declared = new Map<string, Declared>()
	const imported = new Map<string, string>()
	const statements = new Set<string>()
	const exported = new Set<string>()
	for (const key in codes) {
		const module = new SourceModule(`${key}.js`, codes[key], key)
		if (module.parseErrors.length) return
		const { source, scopes } = module
		for (const statement of module.program.body) {
			if (statement.type === "ImportDeclaration") {
				const from = statement.source.value
				for (const specifier of statement.specifiers) {
					const local = specifier.local.name
					const text =
						specifier.type === "ImportNamespaceSpecifier" ?
							`import * as ${local} from ${JSON.stringify(from)}`
						: specifier.type === "ImportSpecifier" ?
							`import { ${exportNameOf(specifier.imported)} as ${local} } from ${JSON.stringify(from)}`
						:	undefined
					if (from in codes) {
						if (
							specifier.type !== "ImportSpecifier" ||
							exportNameOf(specifier.imported) !== local
						)
							return
					} else if (!text || (imported.get(local) ?? text) !== text) return
					else imported.set(local, text)
				}
			} else if (
				statement.type === "ExportNamedDeclaration" &&
				!statement.declaration
			) {
				if (statement.source) return
				for (const specifier of statement.specifiers) {
					if (
						exportNameOf(specifier.exported) !== exportNameOf(specifier.local)
					)
						return
					exported.add(exportNameOf(specifier.local))
				}
			} else if (
				statement.type === "VariableDeclaration" ||
				statement.type === "ExportNamedDeclaration"
			) {
				const declaration =
					statement.type === "VariableDeclaration" ?
						statement
					:	statement.declaration
				if (declaration?.type !== "VariableDeclaration") return
				const [declarator] = declaration.declarations
				if (
					declaration.declarations.length !== 1 ||
					declarator.id.type !== "Identifier" ||
					declared.has(declarator.id.name)
				)
					return
				const reads: Declared["reads"] = []
				for (const { id, binding } of scopes.references) {
					if (
						binding?.scope === scopes.root &&
						declaration.start <= id.start &&
						id.end <= declaration.end &&
						binding.name !== declarator.id.name
					)
						reads.push([binding.name, !isDeferred(id, declaration)])
				}
				if (statement.type === "ExportNamedDeclaration")
					exported.add(declarator.id.name)
				declared.set(declarator.id.name, {
					text: source.slice(declaration.start, declaration.end),
					reads
				})
			} else if (
				statement.type === "ExpressionStatement" &&
				statement.expression.type === "ArrowFunctionExpression"
			)
				// e.g. what reads the runtime's version, so another fails to link
				statements.add(source.slice(statement.start, statement.end))
			else return
		}
	}
	for (const name of declared.keys()) if (imported.has(name)) return
	return { declared, imported, statements, exported }
}

// each named import of a site, which the precompiler writes on one line
const siteImport = /^import {([^}]*)} from "(~arktype\/[^"]+)"/gm

// a reference within a function the statement doesn't call as it runs
const isDeferred = (id: Node, statement: Node): boolean => {
	for (let node = id.parent; node && node !== statement; node = node.parent) {
		if (
			(node.type === "ArrowFunctionExpression" ||
				node.type === "FunctionExpression") &&
			!(node.parent?.type === "CallExpression" && node.parent.callee === node)
		)
			return true
	}
	return false
}

const pureRuntimeCall = "/* @__PURE__ */ runtime."

// past the call's closing paren, or at the text's end where it has none
const endOfCall = (code: string, from: number): number => {
	let depth = 0
	let isQuoted = false
	for (let i = from; i < code.length; i++) {
		const char = code[i]
		if (isQuoted) {
			if (char === "\\") i++
			else if (char === '"') isQuoted = false
		} else if (char === '"') isQuoted = true
		else if (char === "(") depth++
		else if (char === ")" && --depth === 0) return i + 1
	}
	return code.length
}

// calls the runtime with literals and what it exports alone
const holdsOnlyData = (call: string): boolean =>
	/^[\s(),:[\]{}-]*$/.test(
		call
			.replace(/"(?:[^"\\]|\\.)*"/g, "")
			.split("/* @__PURE__ */")
			.join("")
			.replace(/\bruntime\.[\w$]+/g, "")
			.replace(
				/\b(?:void 0|true|false|null|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g,
				""
			)
			.replace(/[\w$]+(?=:)/g, "")
	)

// each outermost call in text holding only data, as replace writes it
const replaceDataCalls = (
	code: string,
	replace: (call: string) => string | undefined
): string => {
	let replaced = ""
	let from = 0
	for (
		let at = code.indexOf(pureRuntimeCall);
		at !== -1;
		at = code.indexOf(pureRuntimeCall, from)
	) {
		const end = endOfCall(code, at + pureRuntimeCall.length)
		const call = code.slice(at, end)
		const written = holdsOnlyData(call) ? replace(call) : undefined
		if (written !== undefined) {
			replaced += code.slice(from, at) + written
			from = end
		} else {
			replaced += code.slice(from, at + pureRuntimeCall.length)
			from = at + pureRuntimeCall.length
		}
	}
	return replaced + code.slice(from)
}

// a shorter call's name and declaration cost what sharing saves, and gzip's matches
// save most of a call written less often anyway. On ntwine, gz KB, min MB, import G:
// at 2 calls of 90 116.8, 0.358, 0.179; at 5 of 64 116.2, 0.360, 0.179; none 116.6,
// 0.381, 0.199. On 92 Types, gz KB: 7.62; 7.36; 7.35. Smallest gz B since, at 5 of
// 64 / 7 of 40: benchScale's mixed apps of 200 Types 11349 / 11195, 11131 / 10967,
// 11283 / 11109, 50 and 10 within 8; board 92 6213 / 6191, 230 8730 / 8713, 1012
// 21501 / 21504; ntwine 128945 / 129015. Shorter or rarer calls than that cost
// again (at 7 of 32, 50 Types +40; at 3 of 64, +20)
const minSharedCall = 40

const minSharedCalls = 7

const writeImports = (names: Iterable<string>): string =>
	[...names]
		.map(name => `import { ${name} } from "~arktype/${name}"\n`)
		.join("")

// what a creator's validator is passed to fail with: a name, or one condition
const failArgument = String.raw`(\((?:[^()]|\([^()]*\))*\)|[\w.]+)`

// each way a creator's validator finds the issues of data its Allows rejected
const foundCall = new RegExp(
	String.raw`\bruntime\.(foundErrors|applyIssues)\(allows, data, ${failArgument}\)|\bruntime\.applyErrors\(allows, data, runtime\.runtimeConfig, ${failArgument}, runtime\.Traversal\)`,
	"g"
)

const applyingErrors =
	"(apply, data, onFail) => runtime.applyErrors(apply, data, runtime.runtimeConfig, onFail, runtime.Traversal)"

// the module of a creator taking its root's Allows, itself or in an array
const creatorModule =
	/^import \* as runtime from "arktype\/runtime"\n\nconst (create\w+) = \((\[allows]|allows)((?:, \w+(?: = [\w.]+)?)*)\) => {\n([\S\s]*)\n}\n\nexport { \1 }\n$/

interface Creator {
	specifier: string
	name: string
	// how it takes its root's Allows: `allows` or `[allows]`
	takes: string
	// its other params, as written after that one
	rest: string
	// its body, calling `found` where it finds a root's issues
	body: string
	// what it found them with
	finder: string
}

// A program's validators are created by a few functions alike but for what
// finds a root's issues, which depends on whether it runs a narrow and whether
// one reads its ctx, and for taking its Allows in an array. Each is a dozen
// lines no minifier shares, so those of one body are written once: the first
// takes what finds the issues, by default its own, and each other passes it
// its own. A program with one of them is written as it was
const withOneCreator = (
	modules: Record<string, string>
): Record<string, string> => {
	const alike = new Map<string, Creator[]>()
	for (const specifier of Object.keys(modules).sort()) {
		const match = creatorModule.exec(modules[specifier])
		if (!match) continue
		const [, name, takes, rest, written] = match
		const finders = new Set<string>()
		const body = written.replace(
			foundCall,
			(_, finder?: string, failing?: string, traversed?: string) => {
				finders.add(finder ? `runtime.${finder}` : applyingErrors)
				return `found(allows, data, ${failing ?? traversed})`
			}
		)
		if (finders.size !== 1 || /\bfound\b/.test(written)) continue
		const creator: Creator = {
			specifier,
			name,
			takes,
			rest,
			body,
			finder: [...finders][0]
		}
		const key = `${rest}\n${body}`
		const creators = alike.get(key)
		if (creators) creators.push(creator)
		else alike.set(key, [creator])
	}
	const codes = { ...modules }
	const runtime = `import * as runtime from "arktype/runtime"\n\n`
	for (const creators of alike.values()) {
		if (creators.length < 2) continue
		// one taking the Allows itself is passed no array made for the call
		const first =
			creators.find(creator => creator.takes === "allows") ?? creators[0]
		const others = creators.filter(creator => creator !== first)
		codes[first.specifier] =
			`${runtime}const ${first.name} = (${first.takes}${first.rest}, found = ${first.finder}) => {\n${first.body}\n}\n\nexport { ${first.name} }\n`
		const passed = `${first.takes}${first.rest.replace(/ = [\w.]+/g, "")}`
		for (const { specifier, name, takes, rest, finder } of others) {
			codes[specifier] =
				`import { ${first.name} } from ${JSON.stringify(first.specifier)}\n${runtime}const ${name} = (${takes}${rest}) => ${first.name}(${passed}, ${finder})\n\nexport { ${name} }\n`
		}
	}
	return codes
}

// a checker holding only data is the same wherever it's written, so what's
// written more than once is made once. Each makes closures an import runs,
// which gzip's matches for its text don't save
const withSharedChecks = (
	modules: Record<string, string>
): Record<string, string> => {
	const codes = { ...modules }
	// each shared call, of which only what it holds may be shared in turn
	const calls = new Map<string, string>()
	const importsOf = new Map<string, Set<string>>()
	const bodyOf = (call: string) => call.slice(pureRuntimeCall.length)
	for (let pass = 0; pass < maxPasses; pass++) {
		const counts = new Map<string, number>()
		const count = (code: string) => {
			replaceDataCalls(code, call => {
				counts.set(call, (counts.get(call) ?? 0) + 1)
				return undefined
			})
		}
		for (const specifier in codes) count(codes[specifier])
		for (const call of calls.values()) count(bodyOf(call))
		const shareIn = (code: string, imports: Set<string>) =>
			replaceDataCalls(code, call => {
				if (counts.get(call)! < minSharedCalls || call.length < minSharedCall)
					return
				const name = `check${hashOf(call)}`
				calls.set(name, call)
				imports.add(name)
				return name
			})
		let shared = false
		for (const specifier in codes) {
			const imports = new Set<string>()
			const code = shareIn(codes[specifier], imports)
			if (code === codes[specifier]) continue
			shared = true
			codes[specifier] = writeImports(imports) + code
		}
		for (const [name, call] of calls) {
			const imports = importsOf.get(name) ?? new Set<string>()
			importsOf.set(name, imports)
			const written = pureRuntimeCall + shareIn(bodyOf(call), imports)
			if (written === call) continue
			shared = true
			calls.set(name, written)
		}
		if (!shared) break
	}
	for (const [name, call] of calls) {
		codes[`~arktype/${name}`] =
			writeImports(importsOf.get(name)!) +
			`import * as runtime from "arktype/runtime"\n\nconst ${name} = ${call}\n\nexport { ${name} }\n`
	}
	return codes
}

export const virtualSource = /"(~arktype\/[^"]+)"/g

export const renamedOf = (
	codes: Record<string, string>,
	original: Record<string, string>
): Record<string, string> | undefined => {
	const importsOf = (specifier: string) =>
		[...codes[specifier].matchAll(virtualSource)]
			.map(match => match[1])
			.filter(imported => imported in codes)
	const renamed: Record<string, string> = {}
	const state: Record<string, "visiting" | "done"> = {}
	const visit = (specifier: string): boolean => {
		if (state[specifier] === "done") return true
		if (state[specifier] === "visiting") return false
		state[specifier] = "visiting"
		const imports = importsOf(specifier)
		for (const imported of imports) if (!visit(imported)) return false
		const code = withRenamed(codes[specifier], renamed)
		if (code !== original[specifier])
			renamed[specifier] = `${specifier}-${hashOf(code)}`
		state[specifier] = "done"
		return true
	}
	for (const specifier in codes) {
		if (visit(specifier)) continue
		// a cycle of modules any of which changed can't be renamed in order
		if (Object.keys(codes).some(s => codes[s] !== original[s])) return
	}
	return renamed
}

const withRenamed = (code: string, renamed: Record<string, string>) =>
	code.replace(virtualSource, (match, specifier: string) =>
		specifier in renamed ? JSON.stringify(renamed[specifier]) : match
	)

interface Unit {
	key: string
	module: SourceModule
	isSite: boolean
	prefix: string
	edits: MagicString
	added: string[]
	importsByLocal: Map<string, string>
}

interface Read {
	unit: Unit
	reference: Reference
}

interface Creation {
	site: Unit
	statement: Node
	name: string
	creator: Binding
	checker: Reference
	// each read of the validator by the site's own code
	reads: Reference[]
}

class Linker {
	private units: Unit[] = []
	private unitsByKey = new Map<string, Unit>()
	private readsByBinding = new Map<Binding, Read[]>()
	private ownerByBinding = new Map<Binding, Unit>()
	private declaresCreated = new Set<Binding>()
	private readAsCreated = new Set<Binding>()
	unexposed = 0

	constructor(
		codes: Record<string, string>,
		siteCodes: Record<string, string>,
		sites: Record<string, LinkedSite>
	) {
		for (const key in codes)
			this.add(key, new SourceModule(`${key}.js`, codes[key], key), false, "")
		for (const id in siteCodes) {
			this.add(
				id,
				new SourceModule(id, siteCodes[id], id),
				true,
				prefixOf(sites[id].source, id)
			)
		}
	}

	private add(
		key: string,
		module: SourceModule,
		isSite: boolean,
		prefix: string
	) {
		const unit: Unit = {
			key,
			module,
			isSite,
			prefix,
			edits: new MagicString(module.source),
			added: [],
			importsByLocal: new Map()
		}
		this.units.push(unit)
		this.unitsByKey.set(key, unit)
	}

	codes(): Record<string, string> {
		const result: Record<string, string> = {}
		for (const unit of this.units)
			if (!unit.isSite) result[unit.key] = this.textOf(unit)
		return result
	}

	sites(renamed: Record<string, string>): [id: string, LinkedCode][] {
		return this.units.flatMap((unit): [string, LinkedCode][] => {
			if (!unit.isSite) return []
			const { edits, module } = unit
			for (const match of module.source.matchAll(virtualSource)) {
				const specifier = match[1]
				if (specifier in renamed) {
					edits.overwrite(
						match.index,
						match.index + match[0].length,
						JSON.stringify(renamed[specifier])
					)
				}
			}
			writeImportsAhead(
				edits,
				module.program,
				withRenamed(unit.added.join(""), renamed)
			)
			return [
				[
					unit.key,
					{
						code: edits.toString(),
						map:
							edits.hasChanged() ?
								edits.generateMap({ hires: "boundary" })
							:	undefined
					}
				]
			]
		})
	}

	private textOf(unit: Unit): string {
		const text = unit.edits.clone()
		writeImportsAhead(text, unit.module.program, unit.added.join(""))
		return text.toString()
	}

	siteTexts(): string[] {
		return this.units.filter(unit => unit.isSite).map(unit => this.textOf(unit))
	}

	link({
		intoSites,
		exposesAllows = false,
		declaresEach = false
	}: LinkPass): boolean {
		// e.g. a statement writing a checker read once, which a copy of it wouldn't have
		for (const unit of this.units) {
			const unread = unit.isSite ? unreadCreationsOf(unit) : undefined
			for (const reference of unit.module.scopes.references) {
				const statement = statementOf(reference.id)
				if (
					unread ? !unread.has(statement) : runs(statement, unit.module.source)
				)
					this.read(unit, reference)
			}
		}
		if (intoSites) {
			this.declareCreated(exposesAllows, declaresEach)
			this.readAllowsAsCreated()
		}
		// a declaration written into can't be copied before it's read again
		const written = new Set<Node>()
		let linked = false
		for (const [binding, reads] of this.readsByBinding) {
			if (
				reads.length !== 1 ||
				this.declaresCreated.has(binding) ||
				this.readAsCreated.has(binding)
			)
				continue
			const owner = this.ownerByBinding.get(binding)!
			const [read] = reads
			const into = statementOf(read.reference.id)
			if (
				read.unit.isSite !== intoSites ||
				// a name a site exports can't be written as what declares it
				read.reference.id.parent?.type === "ExportSpecifier" ||
				// nor a validator an earlier link declared where the site's own code
				// reads it: written there, it would be created each time that runs
				(read.unit.isSite && createsValidator(owner, binding)) ||
				written.has(statementOf(binding.declaration)) ||
				!this.inline(owner, binding, read)
			)
				continue
			written.add(into)
			linked = true
		}
		return linked
	}

	// a validator read only as `.allows` is read as the checker it's created from
	private readAllowsAsCreated(): void {
		for (const site of this.units) {
			if (!site.isSite) continue
			const { module, edits } = site
			for (const statement of module.program.body) {
				if (
					statement.type !== "VariableDeclaration" ||
					statement.declarations.length !== 1
				)
					continue
				const [{ id, init }] = statement.declarations
				const binding =
					id.type === "Identifier" ?
						module.scopes.bindingsById.get(id)
					:	undefined
				const creator =
					init?.type === "CallExpression" &&
					module.scopes.byId.get(init.callee)?.binding
				if (
					!binding?.references.length ||
					binding.exportNames.length ||
					!creator ||
					!importSourceOf(creator)?.startsWith("~arktype/") ||
					init?.type !== "CallExpression" ||
					init.arguments.length !== 1 ||
					!this.createsAllowsObject(importedNameOf(creator))
				)
					continue
				const reads = binding.references.map(({ id }) => id.parent)
				if (!reads.every(readsAllows)) continue
				const [checker] = init.arguments
				const imported = module.scopes.byId.get(checker)?.binding
				const declared = imported && this.declarationOf(site, imported)
				if (declared) {
					// the checker stays declared, as an alias of it would be kept
					this.readAsCreated.add(declared[1])
					edits.remove(statement.start, statement.end)
					for (const read of reads)
						edits.overwrite(read.start, read.end, imported.name)
					continue
				}
				const annotation = pureAnnotationOf(module.source, init) ?? ""
				edits.remove(init.start - annotation.length, checker.start)
				edits.remove(checker.end, init.end)
				for (const read of reads) edits.remove(read.object.end, read.end)
			}
		}
	}

	// whether a create function makes an object of the allows it's passed alone
	private createsAllowsObject(name: string): boolean {
		const declaration = new RegExp(
			`\\bconst ${name} = \\(?allows\\)? => \\{\\s*const validator = \\{ allows: allows \\}\\s*return validator\\s*\\}`
		)
		return this.units.some(
			unit => !unit.isSite && declaration.test(unit.module.source)
		)
	}

	// declares a checker one site creates its validator from as that validator,
	// among the units where they're one module
	private declareCreated(exposesAllows: boolean, declaresEach: boolean): void {
		const creationsByBinding = new Map<Binding, Creation | undefined>()
		for (const unit of this.units) {
			if (!unit.isSite) continue
			for (const reference of unit.module.scopes.references) {
				const declared =
					reference.binding && this.declarationOf(unit, reference.binding)
				if (!declared) continue
				const [, binding] = declared
				creationsByBinding.set(
					binding,
					creationsByBinding.has(binding) ? undefined : (
						creationOf(unit, reference)
					)
				)
			}
		}
		const readsOf = new Map<Binding, [Unit, Reference][]>()
		for (const unit of this.units) {
			if (unit.isSite) continue
			for (const reference of unit.module.scopes.references) {
				const declared =
					reference.id.parent?.type !== "ExportSpecifier" &&
					reference.binding &&
					this.declarationOf(unit, reference.binding)
				if (!declared || !creationsByBinding.get(declared[1])) continue
				const reads = readsOf.get(declared[1])
				if (reads) reads.push([unit, reference])
				else readsOf.set(declared[1], [[unit, reference]])
			}
		}
		const importsByUnit = new Map<Unit, Map<string, string>>()
		for (const [binding, creation] of creationsByBinding) {
			const reads = readsOf.get(binding) ?? []
			const live = this.readsByBinding.get(binding)?.length ?? 0
			// read elsewhere, by a unit, it reads the validator's allows
			const readsAllows = live > 1
			if (
				!creation ||
				!live ||
				(!readsAllows && !declaresEach) ||
				reads.some(
					([unit]) => this.allowsReadOf(unit, "", new Map()) === undefined
				) ||
				!this.declareAsCreated(binding, creation, exposesAllows || !readsAllows)
			)
				continue
			if (readsAllows && !exposesAllows) {
				this.unexposed++
				continue
			}
			this.declaresCreated.add(binding)
			for (const [unit, { id }] of reads) {
				let imports = importsByUnit.get(unit)
				if (!imports) importsByUnit.set(unit, (imports = new Map()))
				unit.edits.overwrite(
					id.start,
					id.end,
					this.allowsReadOf(unit, id.name, imports)!
				)
			}
		}
		for (const [unit, imports] of importsByUnit) addImports(unit, imports)
	}

	// read as a call: a bundler keeps any property read of a declaration it otherwise drops
	private allowsReadOf(
		reader: Unit,
		validator: string,
		imports: Map<string, string>
	): string | undefined {
		const runtime = this.localOf(
			reader,
			"runtime",
			"* as",
			"arktype/runtime",
			imports
		)
		return runtime && `/* @__PURE__ */ ${runtime}.allowsOf(${validator})`
	}

	private declareAsCreated(
		binding: Binding,
		{ site, statement, name, creator, checker, reads }: Creation,
		edits: boolean
	): boolean {
		const owner = this.ownerByBinding.get(binding)!
		const declarator = binding.declaration
		if (
			declarator.type !== "VariableDeclarator" ||
			declarator.init?.type !== "CallExpression" ||
			!isAtTopLevel(declarator)
		)
			return false
		const { init } = declarator
		const { source } = owner.module
		if (!pureAnnotation.test(source.slice(declarator.id.end, init.start)))
			return false
		// e.g. a statement writing the checker's transform, which would write the validator's
		for (const reference of binding.references)
			if (runs(statementOf(reference.id), source)) return false
		const declared = this.declarationOf(site, creator)
		if (!declared) return false
		const [module, created] = declared
		const imports = new Map<string, string>()
		const local =
			created.exportNames.length ?
				this.localOf(
					owner,
					created.name,
					created.exportNames[0],
					module.key,
					imports,
					created
				)
			:	undefined
		if (local === undefined) return false
		if (!edits) return true
		owner.edits.prependRight(init.start, `${local}(/* @__PURE__ */ `)
		owner.edits.appendLeft(init.end, ")")
		addImports(owner, imports)
		// the unit is the validator now, under the name the site imports it by
		const validator = checker.id.name
		if (statement.type === "ExportNamedDeclaration") {
			site.edits.overwrite(
				statement.start,
				statement.end,
				`export { ${validator} as ${name} }`
			)
		} else site.edits.remove(statement.start, statement.end)
		// which each read by the site's own code reads, as no const is left to
		for (const { id } of reads) {
			const parent = id.parent
			if (parent?.type === "ExportSpecifier") {
				site.edits.overwrite(
					parent.start,
					parent.end,
					`${validator} as ${site.module.source.slice(parent.exported.start, parent.exported.end)}`
				)
			} else {
				site.edits.overwrite(
					id.start,
					id.end,
					parent?.type === "Property" && parent.shorthand ?
						`${name}: ${validator}`
					:	validator
				)
			}
		}
		return true
	}

	private read(unit: Unit, reference: Reference): void {
		const binding = reference.binding
		if (!binding || binding.scope !== unit.module.scopes.root) return
		// a unit's own list of what it declares reads none of it, where a site's
		// names a validator the app reads, as one a link before this declared
		if (reference.id.parent?.type === "ExportSpecifier" && !unit.isSite) return
		const declared = this.declarationOf(unit, binding)
		if (!declared) return
		const [owner, declaration] = declared
		const reads = this.readsByBinding.get(declaration)
		if (reads) {
			reads.push({ unit, reference })
			return
		}
		this.readsByBinding.set(declaration, [{ unit, reference }])
		this.ownerByBinding.set(declaration, owner)
		// what a declaration reads is live once it is
		const { declaration: node } = declaration
		for (const inner of owner.module.scopes.references) {
			if (
				inner.id !== declaration.id &&
				node.start <= inner.id.start &&
				inner.id.end <= node.end
			)
				this.read(owner, inner)
		}
	}

	private declarationOf(
		unit: Unit,
		binding: Binding
	): [Unit, Binding] | undefined {
		for (let depth = 0; depth < 16; depth++) {
			if (binding.kind === "const" || binding.kind === "function")
				return unit.isSite ? undefined : [unit, binding]
			const specifier = binding.declaration
			if (
				binding.kind !== "import" ||
				specifier.type !== "ImportSpecifier" ||
				specifier.parent?.type !== "ImportDeclaration"
			)
				return
			const target = this.unitsByKey.get(specifier.parent.source.value)
			const exported =
				target?.module.scopes.exportsByName[exportNameOf(specifier.imported)]
			if (!target || exported?.kind !== "binding") return
			unit = target
			binding = exported.binding
		}
	}

	private inline(owner: Unit, binding: Binding, read: Read): boolean {
		const declarator = binding.declaration
		if (
			!binding.name.endsWith("Allows") ||
			binding.kind !== "const" ||
			declarator.type !== "VariableDeclarator" ||
			declarator.init?.type !== "CallExpression" ||
			!isAtTopLevel(read.reference.id) ||
			!isAtTopLevel(declarator)
		)
			return false
		const init = declarator.init
		const text = new MagicString(owner.module.source)
		const imports = new Map<string, string>()
		const exports: string[] = []
		for (const reference of owner.module.scopes.references) {
			const { id } = reference
			if (id.start < init.start || init.end < id.end) continue
			const outer = reference.binding
			// a global, which a binding of the reader's may shadow
			if (!outer) {
				if (namesBinding(read.unit, id.name)) return false
				continue
			}
			// e.g. a callback's parameter, or what the reader's own module declares
			if (outer.scope !== owner.module.scopes.root || read.unit === owner)
				continue
			const source = importSourceOf(outer)
			let local: string | undefined
			if (source === "arktype/runtime" && isNamespaceImport(outer))
				local = this.localOf(read.unit, outer.name, `* as`, source, imports)
			else if (source?.startsWith("~arktype/") && !isNamespaceImport(outer)) {
				local = this.localOf(
					read.unit,
					outer.name,
					importedNameOf(outer),
					source,
					imports,
					this.declarationOf(owner, outer)?.[1]
				)
			} else if (outer.kind === "const") {
				local = this.localOf(
					read.unit,
					outer.name,
					outer.name,
					owner.key,
					imports,
					outer
				)
				const exported = owner.module.scopes.exportsByName[outer.name]
				if (!exported) exports.push(outer.name)
				// e.g. `export { other as name }`, which an import of it would read
				else if (exported.kind !== "binding" || exported.binding !== outer)
					return false
			} else if (
				source !== undefined &&
				outer.kind === "import" &&
				!isNamespaceImport(outer)
			) {
				// what a callback written into a unit reads of the app's own
				// modules, under a name no other import is given
				local = this.localOf(
					read.unit,
					outer.name,
					importedNameOf(outer),
					source,
					imports
				)
			}
			if (local === undefined) return false
			const declared = this.declarationOf(owner, outer)?.[1]
			const value =
				declared && this.declaresCreated.has(declared) ?
					this.allowsReadOf(read.unit, local, imports)
				:	local
			if (value === undefined) return false
			if (value !== id.name) text.overwrite(id.start, id.end, value)
		}
		const { id } = read.reference
		// with its annotation, so a bundler still drops it where it's unread
		const annotation = pureAnnotation.test(
			owner.module.source.slice(declarator.id.end, init.start)
		)
		read.unit.edits.overwrite(
			id.start,
			id.end,
			`${annotation ? "/* @__PURE__ */ " : ""}${text.slice(init.start, init.end)}`
		)
		addImports(read.unit, imports)
		for (const name of exports) {
			const statement = `\nexport { ${name} }`
			if (!owner.added.includes(statement)) owner.added.push(statement)
		}
		return true
	}

	private localOf(
		reader: Unit,
		name: string,
		imported: string,
		source: string,
		imports: Map<string, string>,
		declared?: Binding
	): string | undefined {
		const local = reader.isSite ? `${reader.prefix}_${name}` : name
		const clause =
			imported === "* as" ?
				`* as ${local}`
			:	`{ ${imported === local ? local : `${imported} as ${local}`} }`
		const statement = `\nimport ${clause} from ${JSON.stringify(source)}`
		const existing = reader.module.scopes.root.bindings[local]
		if (existing) {
			// the reader already imports it, as a module of units does the runtime
			const isSame =
				imported === "* as" ?
					importSourceOf(existing) === source && isNamespaceImport(existing)
				:	this.declarationOf(reader, existing)?.[1] === declared
			return isSame ? local : undefined
		}
		// a global the reader reads, which the import would shadow
		if (
			reader.module.scopes.root.unresolved.some(
				({ id, binding }) => !binding && id.name === local
			)
		)
			return
		const added = reader.importsByLocal.get(local) ?? imports.get(local)
		if (added !== undefined) return added === statement ? local : undefined
		imports.set(local, statement)
		return local
	}
}

const readsAllows = (read: Node | null | undefined): read is MemberExpression =>
	read?.type === "MemberExpression" &&
	!read.computed &&
	read.property.type === "Identifier" &&
	read.property.name === "allows" &&
	!isWriteTarget(read)

// A site's const creating a validator from a checker nothing else in the module
// reads: one it exports, or one its own code reads, as a handler does the Type
// declared beside it.
//
// Declared as created, the validator is the unit's, made as the unit's module
// loads, and the site's const is gone: its export and its reads name what the
// site imports the unit as. That reads the same object wherever the const was
// read, given what's checked here and in declareAsCreated:
// - made once, by a call the precompiler wrote and marked pure, of the checker
//   alone, so when it's made is unobservable, and the unit's module loads
//   before the site's body runs, as any module a site imports does
// - a const at the module's top level, so no write of it and no second
//   object: one in a function is created each time that runs, and is left
// - no read the module makes as it loads ahead of the declaration, which
//   throws where the const is and wouldn't of an import. One in a function is
//   read whenever that's called: called before the declaration ran, it threw,
//   and now reads the validator, as a module importing an exported one in a
//   cycle already could
// - no read TypeScript erases is rewritten, as scopes hold none, and a JSX
//   name isn't one an import's can be written as
const creationOf = (site: Unit, checker: Reference): Creation | undefined => {
	const call = checker.id.parent
	if (
		call?.type !== "CallExpression" ||
		call.arguments.length !== 1 ||
		call.arguments[0] !== checker.id ||
		call.callee.type !== "Identifier"
	)
		return
	const declarator = call.parent
	const declaration = declarator?.parent
	if (
		declarator?.type !== "VariableDeclarator" ||
		declarator.init !== call ||
		declarator.id.type !== "Identifier" ||
		declarator.id.typeAnnotation ||
		declaration?.type !== "VariableDeclaration" ||
		declaration.kind !== "const" ||
		declaration.declarations.length !== 1
	)
		return
	const isExported = declaration.parent?.type === "ExportNamedDeclaration"
	if (!isExported && declaration.parent?.type !== "Program") return
	const statement = isExported ? declaration.parent! : declaration
	const { scopes } = site.module
	const binding = scopes.bindingsById.get(declarator.id)
	const creator = scopes.byId.get(call.callee)?.binding
	if (
		!binding ||
		!creator ||
		!importSourceOf(creator)?.startsWith("~arktype/") ||
		!importedNameOf(creator).startsWith("create")
	)
		return
	const reads = binding.references
	if (
		reads.length ?
			!reads.every(
				({ id, isWrite }) =>
					!isWrite &&
					id.type === "Identifier" &&
					(statement.end <= id.start ||
						id.parent?.type === "ExportSpecifier" ||
						isInFunction(id))
			) ||
			// read only as `.allows`, it's read as its checker instead
			(!binding.exportNames.length &&
				reads.every(({ id }) => readsAllows(id.parent)))
		:	!isExported || binding.exportNames.length !== 1
	)
		return
	return {
		site,
		statement,
		name: binding.name,
		creator,
		checker,
		reads
	}
}

// whether a unit's declaration creates a validator, as declareAsCreated writes one
const createsValidator = (owner: Unit, binding: Binding): boolean => {
	const declarator = binding.declaration
	if (
		declarator.type !== "VariableDeclarator" ||
		declarator.init?.type !== "CallExpression" ||
		declarator.init.callee.type !== "Identifier"
	)
		return false
	const creator = owner.module.scopes.byId.get(declarator.init.callee)?.binding
	return (
		!!creator &&
		(creator.kind === "import" ?
			importedNameOf(creator)
		:	creator.name
		).startsWith("create")
	)
}

const addImports = (unit: Unit, imports: Map<string, string>): void => {
	for (const [local, statement] of imports) {
		unit.importsByLocal.set(local, statement)
		unit.added.push(statement)
	}
}

const namesBinding = (unit: Unit, name: string): boolean => {
	for (const binding of unit.module.scopes.bindingsById.values())
		if (binding.name === name) return true
	return false
}

// a site's validator no read reaches, which bundlers drop as its creation is pure
const unreadCreationsOf = (unit: Unit): Set<Node> => {
	const result = new Set<Node>()
	for (const statement of unit.module.program.body) {
		if (
			statement.type !== "VariableDeclaration" ||
			statement.kind !== "const" ||
			statement.declarations.length !== 1
		)
			continue
		const [declarator] = statement.declarations
		const binding =
			declarator.id.type === "Identifier" ?
				unit.module.scopes.bindingsById.get(declarator.id)
			:	undefined
		const callee =
			declarator.init?.type === "CallExpression" ?
				declarator.init.callee
			:	undefined
		const creator =
			callee?.type === "Identifier" ?
				unit.module.scopes.byId.get(callee)?.binding
			:	undefined
		if (
			binding &&
			!binding.references.length &&
			!binding.exportNames.length &&
			creator &&
			importSourceOf(creator)?.startsWith("~arktype/")
		)
			result.add(statement)
	}
	return result
}

const pureAnnotation = /\/\*\s*[#@]__PURE__\s*\*\//

// a declaration creating a checker doesn't run
const runs = (statement: Node, source: string): boolean => {
	const declaration =
		statement.type === "ExportNamedDeclaration" ?
			(statement.declaration ?? undefined)
		:	statement
	if (!declaration) return false
	if (
		declaration.type === "ImportDeclaration" ||
		declaration.type === "ExportAllDeclaration" ||
		declaration.type === "FunctionDeclaration"
	)
		return false
	if (
		declaration.type !== "VariableDeclaration" ||
		declaration.kind !== "const"
	)
		return true
	return declaration.declarations.some(
		declarator => !declarator.init || writesIn(declarator.init, source)
	)
}

// only a call the precompiler marks pure is known not to write
const writesIn = (expression: Node, source: string): boolean => {
	let writes = false
	walk(expression, node => {
		if (
			node.type === "ArrowFunctionExpression" ||
			node.type === "FunctionExpression"
		)
			return false
		writes ||=
			node.type === "AssignmentExpression" ||
			node.type === "UpdateExpression" ||
			node.type === "AwaitExpression" ||
			node.type === "TaggedTemplateExpression" ||
			(node.type === "UnaryExpression" && node.operator === "delete") ||
			((node.type === "CallExpression" || node.type === "NewExpression") &&
				!pureAnnotated.test(
					source.slice(Math.max(0, node.start - 32), node.start)
				))
		return !writes
	})
	return writes
}

const pureAnnotated = /\/\*\s*[#@]__PURE__\s*\*\/\s*$/

export const pureAnnotationOf = (
	source: string,
	call: Span
): string | undefined =>
	pureAnnotated.exec(
		source.slice(Math.max(0, call.start - 32), call.start)
	)?.[0]

export const statementOf = (node: Node): Node => {
	while (node.parent && node.parent.type !== "Program") node = node.parent
	return node
}

// within a function the module doesn't call where it's written, so run when
// that's called, not as the module loads
const isInFunction = (node: Node): boolean => {
	for (let parent = node.parent; parent; parent = parent.parent) {
		if (
			parent.type === "FunctionDeclaration" ||
			((parent.type === "FunctionExpression" ||
				parent.type === "ArrowFunctionExpression") &&
				!(
					parent.parent?.type === "CallExpression" &&
					parent.parent.callee === parent
				))
		)
			return true
	}
	return false
}

const isAtTopLevel = (node: Node): boolean => {
	for (let parent = node.parent; parent; parent = parent.parent) {
		if (
			parent.type === "FunctionDeclaration" ||
			parent.type === "FunctionExpression" ||
			parent.type === "ArrowFunctionExpression" ||
			parent.type === "ClassBody"
		)
			return false
	}
	return true
}

const importSourceOf = (binding: Binding): string | undefined =>
	(
		binding.kind === "import" &&
		binding.declaration.parent?.type === "ImportDeclaration"
	) ?
		binding.declaration.parent.source.value
	:	undefined

const isNamespaceImport = (binding: Binding): boolean =>
	binding.declaration.type === "ImportNamespaceSpecifier"

const importedNameOf = (binding: Binding): string =>
	binding.declaration.type === "ImportSpecifier" ?
		exportNameOf(binding.declaration.imported)
	:	"default"

// Svelte compiles a module like cart.svelte.ts after the build, refusing a name that begins with $
export const prefixOf = (source: string, id: string): string => {
	let prefix = /\.svelte\.\w+$/.test(id) ? "ark$" : "$ark"
	while (source.includes(prefix)) prefix += "$"
	return prefix
}
