import { hashOf } from "@ark/util"
import MagicString, { type SourceMap } from "magic-string"
import type { Node, Span } from "oxc-parser"
import { SourceModule } from "./module.ts"
import { exportNameOf, walk, type Binding, type Reference } from "./scope.ts"

export interface LinkedSite {
	// the module's source, which names its own locals
	source: string
	code: string
}

export interface LinkedBundle {
	sites: Record<string, LinkedCode>
	modules: Record<string, string>
	// the units that would be declared as the validator a site creates from
	// them, were validators to expose allows
	unexposed: number
}

export interface LinkedCode {
	code: string
	// to the code it was given, for a site module it changed
	map: SourceMap | undefined
}

export interface LinkOptions {
	// each validator exposes what it's created from as allows
	exposesAllows?: boolean
	// the bundle is one chunk, so its units may be one module
	isOneChunk?: boolean
}

// a bundle's precompiled modules with each checker the bundle reads once
// written where it's read, as a unit of its own costs its name twice. Each
// module it changes is renamed for what it holds, and the original is kept,
// so a module the bundle loads unlinked reads what it always did
export const linkBundle = (
	sites: Record<string, LinkedSite>,
	modules: Record<string, string>,
	{ exposesAllows = false, isOneChunk = false }: LinkOptions = {}
): LinkedBundle | undefined => {
	let codes = modules
	const siteCodes = Object.fromEntries(
		Object.entries(sites).map(([id, site]) => [id, site.code])
	)
	// units into units until none is read once by another, then into sites
	for (let pass = 0; pass < maxPasses; pass++) {
		const linker = new Linker(codes, siteCodes, sites)
		if (!linker.link(false)) break
		codes = linker.codes()
	}
	const linker = new Linker(codes, siteCodes, sites)
	linker.link(true, exposesAllows, isOneChunk)
	codes = linker.codes()
	const one = isOneChunk ? oneModuleOf(codes, linker.siteTexts()) : undefined
	const renamed = one?.renamed ?? renamedOf(codes, modules)
	if (!renamed) return
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
	// each module a site imports, as the one module
	renamed: Record<string, string>
}

interface Declared {
	text: string
	// what it reads of what the units declare or import, and whether it reads
	// it as it's declared rather than in a function
	reads: [name: string, isEager: boolean][]
}

// a one-chunk bundle's units in one module, declaring what its sites read in
// the order they read it, each after what it reads, so a bundler writes them
// as one declaration in the program's order and names them as one module's,
// without what no site reads. Each unit must declare or import what it reads
// by the name it's exported as, as a unit module does
const oneModuleOf = (
	codes: Record<string, string>,
	siteTexts: string[]
): OneModule | undefined => {
	const declared = new Map<string, Declared>()
	// the statement importing each name from beyond the units
	const imported = new Map<string, string>()
	const statements = new Set<string>()
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
							`import * as ${local} from "${from}"`
						: specifier.type === "ImportSpecifier" ?
							`import { ${exportNameOf(specifier.imported)} as ${local} } from "${from}"`
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
	const order: string[] = []
	const states = new Map<string, "visiting" | "done">()
	// each declaration after what it reads, unless it reads it in a function
	// it doesn't call where the two read each other
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

export const virtualSource = /"(~arktype\/[^"]+)"/g

// each changed module, by what it holds, then each importing it, in order
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

// each import of a renamed module renamed
const withRenamed = (code: string, renamed: Record<string, string>) =>
	code.replace(virtualSource, (match, specifier: string) =>
		specifier in renamed ? `"${renamed[specifier]}"` : match
	)

interface Unit {
	key: string
	module: SourceModule
	isSite: boolean
	// what names the unit's own locals, for a site module
	prefix: string
	edits: MagicString
	added: string[]
	// each import added, by the local it declares
	importsByLocal: Map<string, string>
}

interface Read {
	unit: Unit
	reference: Reference
}

// a site's export of the validator a call creates from a checker
interface Creation {
	site: Unit
	statement: Node
	name: string
	// what creates it, e.g. a module's create function
	creator: Binding
	checker: Reference
}

class Linker {
	private units: Unit[] = []
	private unitsByKey = new Map<string, Unit>()
	private readsByBinding = new Map<Binding, Read[]>()
	private ownerByBinding = new Map<Binding, Unit>()
	// units declared as the validator a site creates from them
	private declaresCreated = new Set<Binding>()
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

	// each site module, with what it imports renamed
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
						`"${renamed[specifier]}"`
					)
				}
			}
			return [
				[
					unit.key,
					{
						code: edits.toString() + withRenamed(unit.added.join(""), renamed),
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
		return unit.edits.toString() + unit.added.join("")
	}

	siteTexts(): string[] {
		return this.units.filter(unit => unit.isSite).map(unit => this.textOf(unit))
	}

	// whether it wrote any checker where it's read, in sites or other units
	link(
		intoSites: boolean,
		exposesAllows = false,
		// declares each validator its units can, not only those they read
		declaresEach = false
	): boolean {
		// what runs reads what it references, e.g. a statement writing a checker
		// read once, which a copy of it wouldn't have
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
		if (intoSites) this.declareCreated(exposesAllows, declaresEach)
		// a declaration written into can't be copied before it's read again
		const written = new Set<Node>()
		let linked = false
		for (const [binding, reads] of this.readsByBinding) {
			if (reads.length !== 1 || this.declaresCreated.has(binding)) continue
			const owner = this.ownerByBinding.get(binding)!
			const [read] = reads
			const into = statementOf(read.reference.id)
			if (
				read.unit.isSite !== intoSites ||
				written.has(statementOf(binding.declaration)) ||
				!this.inline(owner, binding, read)
			)
				continue
			written.add(into)
			linked = true
		}
		return linked
	}

	// a checker a single site creates its validator from, declared as that
	// validator for the site to export. Where other units read the checker,
	// which they then read as the validator's allows, it saves the site's
	// declaration its name; where none do and the units are one module, it
	// places the validator among them in the order the program reads them,
	// which compresses better than after them
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
		// what each unit reads of another, each read of a validator's checker
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

	// the checker a validator is created from, read as a call, as a bundler
	// keeps any property read of a declaration it otherwise drops
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
		{ site, statement, name, creator, checker }: Creation,
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
		// e.g. a statement writing the checker's transform, which would write
		// the validator's
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
		site.edits.overwrite(
			statement.start,
			statement.end,
			`export { ${checker.id.name} as ${name} }`
		)
		return true
	}

	// a reference to what a unit declares, read where the reference is
	private read(unit: Unit, reference: Reference): void {
		const binding = reference.binding
		if (!binding || binding.scope !== unit.module.scopes.root) return
		if (reference.id.parent?.type === "ExportSpecifier") return
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

	// what a module-level binding names: its declaration and the module holding it
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

	// writes a checker read once in place of its read
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
		// each import the reader lacks, by the local it declares
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

	// the name a reader reads an import by, adding the import where it lacks it
	private localOf(
		reader: Unit,
		name: string,
		imported: string,
		source: string,
		imports: Map<string, string>,
		// what the import names, which the reader may import from another module
		declared?: Binding
	): string | undefined {
		const local = reader.isSite ? `${reader.prefix}_${name}` : name
		const clause =
			imported === "* as" ?
				`* as ${local}`
			:	`{ ${imported === local ? local : `${imported} as ${local}`} }`
		const statement = `\nimport ${clause} from "${source}"`
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

// a site's export declaring a validator a call creates from the checker a
// reference reads alone, which nothing else in the module reads
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
		declaration.declarations.length !== 1 ||
		declaration.parent?.type !== "ExportNamedDeclaration"
	)
		return
	const { scopes } = site.module
	const binding = scopes.bindingsById.get(declarator.id)
	const creator = scopes.refsById.get(call.callee)?.binding
	if (
		!binding ||
		binding.references.length ||
		binding.exportNames.length !== 1 ||
		!creator ||
		!importSourceOf(creator)?.startsWith("~arktype/") ||
		!importedNameOf(creator).startsWith("create")
	)
		return
	return {
		site,
		statement: declaration.parent,
		name: binding.name,
		creator,
		checker
	}
}

// what a unit reads by the imports localOf staged for it
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
				unit.module.scopes.refsById.get(callee)?.binding
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

// whether a statement of a unit's module runs other than declaring what
// another reads, as a declaration creating a checker doesn't
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

// whether evaluating an expression may write, as only a call the precompiler
// marks pure, which writes nothing, doesn't
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

// the annotation marking a call pure, if one ends where it starts
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

// as the precompiler names a module's locals, by what its source lacks.
// Svelte compiles a module like cart.svelte.ts after it, refusing a name
// that begins with $
export const prefixOf = (source: string, id: string): string => {
	let prefix = /\.svelte\.\w+$/.test(id) ? "ark$" : "$ark"
	while (source.includes(prefix)) prefix += "$"
	return prefix
}
