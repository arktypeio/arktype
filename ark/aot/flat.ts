import { hashOf } from "@ark/util"
import MagicString, { type SourceMap } from "magic-string"
import type { Node, Program, Span } from "oxc-parser"
import { memberNameOf } from "./graph.ts"
import {
	prefixOf,
	pureAnnotationOf,
	renamedOf,
	statementOf,
	virtualSource
} from "./link.ts"
import { parseCode, SourceModule } from "./module.ts"
import {
	exportNameOf,
	isWriteTarget,
	loadedSourceOf,
	ModuleScopes,
	unwrapExpression,
	walk,
	type Binding,
	type Reference
} from "./scope.ts"
import { minifiedLengthOf } from "./smaller.ts"

export interface FlatBundle {
	sites: Record<string, FlatSite>
	modules: Record<string, string>
	// what a module reading one of these would read a copy of
	replaced: string[]
}

export interface FlatSite {
	code: string
	map: SourceMap | undefined
}

// the names some module of a bundle may import of each module, true for any
export type ImportedNames = Map<string, Set<string> | true>

// declares a one-chunk bundle's units in one function: V8 inlines a call
// through its constant, not through a module variable a bundler writes as a var
export const flattenBundle = (
	sites: Record<string, string>,
	modules: Record<string, string>,
	imported: ImportedNames,
	whereSmaller = true
): FlatBundle | undefined => {
	const parsed = new Map<string, SourceModule>()
	for (const specifier in modules) {
		parsed.set(
			specifier,
			new SourceModule(`${specifier}.js`, modules[specifier], specifier)
		)
	}
	for (const id in sites) parsed.set(id, new SourceModule(id, sites[id], id))
	if ([...parsed.values()].some(module => module.parseErrors.length)) return
	const keptIn = (skipped?: ReadonlyMap<SourceModule, Creation[]>) => {
		const kept = new KeptCode(parsed, skipped)
		for (const id in sites) kept.keepRead(parsed.get(id)!, imported.get(id))
		for (const specifier in modules) kept.keepRead(parsed.get(specifier)!)
		return kept
	}
	const kept = keptIn()
	const units = unitsOf(modules, parsed, kept)
	if (!units) return
	const creationsBySite = creationsIn(sites, parsed, units, kept)
	const creations = [...creationsBySite.values()].flat()
	const flat = writeFlat(units, creations)
	if (!flat) return
	const specifier = `~arktype/${hashOf(flat.code)}`
	const flattened = new Set(units.map(unit => unit.specifier))
	// a flattened unit is read from the function's module
	const read = new Set(creations.map(creation => creation.name))
	const readKept =
		creations.length ?
			keptIn(
				new Map(
					[...creationsBySite].map(([id, creations]) => [
						parsed.get(id)!,
						creations
					])
				)
			)
		:	kept
	const repointed = new Map<string, Repointed[]>()
	for (const [key, module] of parsed) {
		if (flattened.has(key)) continue
		const edits = repointedIn(
			module,
			flattened,
			flat.exported,
			specifier,
			read,
			readKept
		)
		if (!edits) return
		if (edits.length) repointed.set(key, edits)
	}
	if (!read.size) return
	// as a minifier writes them, flat only where it's smaller
	const unflattened = [
		...units.flatMap(unit =>
			unit.declarations.map(d => unit.module.source.slice(d.start, d.end))
		),
		...new Set(creations.map(creation => creation.creator)),
		...creations.flatMap(creation =>
			creation.args.filter(arg => arg.startsWith("("))
		)
	]
	if (
		whereSmaller &&
		minifiedLengthOf(flat.write([...read])) >=
			minifiedLengthOf(unflattened.join("\n"))
	)
		return
	const codes: Record<string, string> = { ...modules }
	for (const key of flattened) delete codes[key]
	codes[specifier] = flat.writeModule([...read])
	const edit = (
		key: string,
		rename: (specifier: string) => string
	): MagicString | undefined => {
		const module = parsed.get(key)!
		const edits = repointed.get(key) ?? []
		let s: MagicString | undefined
		for (const { start, end, imports } of edits) {
			s ??= new MagicString(module.source)
			s.overwrite(start, end, writeImports(imports, rename))
		}
		for (const match of module.source.matchAll(virtualSource)) {
			const target = rename(match[1])
			if (
				target === match[1] ||
				edits.some(
					({ start, end }) => start <= match.index && match.index < end
				)
			)
				continue
			s ??= new MagicString(module.source)
			s.overwrite(
				match.index,
				match.index + match[0].length,
				JSON.stringify(target)
			)
		}
		return s
	}
	for (const key of repointed.keys())
		if (key in codes) codes[key] = edit(key, unrenamed)!.toString()
	const renamed = renamedOf(codes, modules)
	if (!renamed) return
	const rename = (specifier: string) => renamed[specifier] ?? specifier
	const bundle: FlatBundle = {
		sites: {},
		modules: { ...modules },
		replaced: [
			...flattened,
			...Object.keys(renamed).filter(key => key in modules)
		]
	}
	for (const key in codes) {
		bundle.modules[rename(key)] = codes[key].replace(
			virtualSource,
			(_, imported: string) => JSON.stringify(rename(imported))
		)
	}
	for (const id in sites) {
		bundle.sites[id] = flatSiteOf(
			parsed.get(id)!,
			edit(id, rename),
			creationsBySite.get(id) ?? [],
			kept,
			rename(specifier),
			flat.unwrapped
		)
	}
	return bundle
}

// a site importing what it creates from the flat module, without the
// annotations on what it kept
const flatSiteOf = (
	site: SourceModule,
	s: MagicString | undefined,
	created: Creation[],
	kept: KeptCode,
	specifier: string,
	unwrapped: Set<string>
): FlatSite => {
	const source = JSON.stringify(specifier)
	for (const [start, end] of keptAnnotationsIn(site, kept)) {
		if (
			created.some(creation => creation.start <= start && end <= creation.end)
		)
			continue
		s ??= new MagicString(site.source)
		s.remove(start, end)
	}
	const prefix = prefixOf(site.source, site.id)
	for (const { start, end, name, declared } of created) {
		s ??= new MagicString(site.source)
		// an import, which a bundler doesn't write as a variable holding another
		if (declared) {
			s.overwrite(
				declared.start,
				declared.end,
				`import { ${name} as ${declared.name} } from ${source}\n${declared.exported ? `export { ${declared.name} }\n` : ""}`
			)
			// a read of its one member reads the validator it is
			if (unwrapped.has(name)) {
				for (const [start, end] of declared.memberReads!.spans)
					s.remove(start, end)
			}
		} else {
			const local = `${prefix}_${name}`
			s.overwrite(start, end, local)
			s.prepend(`import { ${name} as ${local} } from ${source}\n`)
		}
	}
	return s ?
			{ code: s.toString(), map: s.generateMap({ hires: "boundary" }) }
		:	{ code: site.source, map: undefined }
}

const unrenamed = (specifier: string) => specifier

// a validator a site creates from units the function declares, which the
// function creates in its place
interface Creation {
	// the call's span, with its annotation
	start: number
	end: number
	name: string
	creator: string
	// the name the function declares the creator as, if others call it
	shared: string | undefined
	// each unit's name or function's text
	args: string[]
	// the declaration it's all of, which an import of it can replace
	declared:
		| {
				start: number
				end: number
				name: string
				exported: boolean
				// the member each read reads, where all read the same one
				memberReads: MemberReads | undefined
		  }
		| undefined
}

const creationsIn = (
	sites: Record<string, string>,
	parsed: Map<string, SourceModule>,
	units: UnitModule[],
	kept: KeptCode
): Map<string, Creation[]> => {
	const result = new Map<string, Creation[]>()
	const declaredIn = new Map(units.map(unit => [unit.specifier, unit]))
	const originOf = (
		binding: Binding | undefined
	): [specifier: string, name: string] | undefined => {
		if (binding?.kind !== "import") return
		const specifier = binding.declaration
		if (
			specifier.type !== "ImportSpecifier" ||
			specifier.parent?.type !== "ImportDeclaration"
		)
			return
		const source = specifier.parent.source.value
		const target = parsed.get(source)
		const entry = target?.scopes.exportsByName[exportNameOf(specifier.imported)]
		if (entry?.kind !== "binding") return
		return entry.binding.kind === "import" ?
				originOf(entry.binding)
			:	[source, entry.binding.name]
	}
	const callsOf = new Map<string, number>()
	for (const module of parsed.values()) {
		for (const binding of Object.values(module.scopes.root.bindings)) {
			const origin = originOf(binding)
			if (!origin) continue
			const key = origin.join("\0")
			const calls = binding.references.filter(
				reference =>
					reference.id.parent?.type !== "ExportSpecifier" &&
					kept.statements.has(statementOf(reference.id))
			).length
			callsOf.set(key, (callsOf.get(key) ?? 0) + calls)
		}
	}
	const names = new Set<string>()
	for (const id in sites) {
		const module = parsed.get(id)!
		const creations: Creation[] = []
		for (const { statement, declaration, call } of keptCallsIn(module, kept)) {
			if (
				call.callee.type !== "Identifier" ||
				!call.arguments.length ||
				!call.arguments.every(arg => arg.type === "Identifier")
			)
				continue
			// a creation the precompiler marks pure runs the same anywhere
			const annotation = pureAnnotationOf(module.source, call)
			if (!annotation) continue
			const bindingOf = (id: Node) =>
				module.scopes.root.bindings[(id as { name: string }).name]
			const creator = originOf(bindingOf(call.callee))
			const args = call.arguments.map(arg => originOf(bindingOf(arg)))
			const fn = creator && creatorFnOf(parsed.get(creator[0])!)
			// a unit by its name, a function nothing else reads by its text
			const written = args.map(arg => {
				if (!arg) return
				if (
					declaredIn
						.get(arg[0])
						?.declarations.some(d => declaredNameOf(d) === arg[1])
				)
					return arg[1]
				const passed =
					callsOf.get(arg.join("\0")) === 1 && creatorFnOf(parsed.get(arg[0])!)
				// parenthesized, so it compiles as it loads
				return passed && `(${passed})`
			})
			if (!fn || written.some(arg => !arg)) continue
			const isShared = callsOf.get(creator.join("\0")) !== 1
			// named for what it's created of where its creator creates others
			const name = `${(isShared ? args[0]! : creator)[1]}Validator`
			if (names.has(name)) continue
			names.add(name)
			const [declarator] = declaration.declarations
			creations.push({
				start: call.start - annotation.length,
				end: call.end,
				name,
				creator: fn,
				shared: isShared ? creator[1] : undefined,
				args: written as string[],
				declared:
					(
						declaration.kind === "const" &&
						declaration.declarations.length === 1 &&
						declarator.id.type === "Identifier"
					) ?
						{
							start: statement.start,
							end: statement.end,
							name: declarator.id.name,
							exported: statement !== declaration,
							memberReads:
								statement === declaration ?
									memberReadsOf(module.scopes.root.bindings[declarator.id.name])
								:	undefined
						}
					:	undefined
			})
		}
		if (creations.length) result.set(id, creations)
	}
	return result
}

const keptCallsIn = (module: SourceModule, kept: KeptCode) => {
	const result: {
		statement: Node
		declaration: Extract<Node, { type: "VariableDeclaration" }>
		call: Call
	}[] = []
	for (const statement of module.program.body) {
		const declaration =
			statement.type === "ExportNamedDeclaration" ?
				statement.declaration
			:	statement
		if (
			declaration?.type !== "VariableDeclaration" ||
			!kept.statements.has(statement)
		)
			continue
		for (const { init } of declaration.declarations) {
			const call = init && unwrapExpression(init)
			if (call?.type === "CallExpression")
				result.push({ statement, declaration, call })
		}
	}
	return result
}

// if it reads only units and runtime members that don't change after load, as configuration may
const creatorFnOf = (module: SourceModule): string | undefined => {
	if (!isUnitModule(module)) return
	const declarations = module.program.body.filter(
		statement => statement.type === "VariableDeclaration"
	)
	if (
		declarations.length !== 1 ||
		declarations[0].type !== "VariableDeclaration"
	)
		return
	const init = declarations[0].declarations[0].init!
	if (
		init.type !== "ArrowFunctionExpression" ||
		init.body.type !== "BlockStatement" ||
		importsOf(module).some(source => source !== runtimeSource)
	)
		return
	const text = module.source.slice(init.start, init.end)
	return /\bruntime\.(?:runtimeConfig|holdHoles)\b/.test(text) ? undefined : (
			text
		)
}

interface MemberReads {
	name: string
	spans: [start: number, end: number][]
}

// the member every read of a binding reads, as `.assert` or `.allows`
const memberReadsOf = (binding: Binding): MemberReads | undefined => {
	let name: string | undefined
	const spans: [number, number][] = []
	for (const { id } of binding.references) {
		const member = id.parent
		const read =
			member?.type === "MemberExpression" && member.object === id ?
				memberNameOf(member)
			:	undefined
		if (
			typeof read !== "string" ||
			(name !== undefined && read !== name) ||
			isWriteTarget(member!)
		)
			return
		name = read
		spans.push([id.end, member!.end])
	}
	return name === undefined ? undefined : { name, spans }
}

// oxc's minifier keeps the annotations of creations kept code reads
const keptAnnotationsIn = (
	module: SourceModule,
	kept: KeptCode
): [start: number, end: number][] =>
	keptCallsIn(module, kept).flatMap(({ call }) => {
		const annotation = pureAnnotationOf(module.source, call)
		return annotation ? [[call.start - annotation.length, call.start]] : []
	})

// an import of units, each name read from the function's module if it's there
interface Repointed {
	start: number
	end: number
	imports: [specifier: string, names: string[]][]
}

const repointedIn = (
	module: SourceModule,
	flattened: ReadonlySet<string>,
	exported: ReadonlySet<string>,
	specifier: string,
	read: Set<string>,
	keptCode: KeptCode
): Repointed[] | undefined => {
	const result: Repointed[] = []
	for (const statement of module.program.body) {
		if (statement.type !== "ImportDeclaration") continue
		const source = statement.source.value
		const flat: string[] = []
		const kept: string[] = []
		for (const imported of statement.specifiers) {
			if (imported.type !== "ImportSpecifier") {
				// a unit read whole would be a copy of the function's
				if (flattened.has(source)) return
				continue
			}
			const name = exportNameOf(imported.imported)
			const local = imported.local.name
			const named = name === local ? name : `${name} as ${local}`
			// an import nothing kept reads links to the unit's own module
			if (
				exported.has(`${source}\0${name}`) &&
				keptCode.reads(module.scopes.root.bindings[local])
			) {
				read.add(name)
				flat.push(named)
			} else kept.push(named)
		}
		if (!flat.length) continue
		result.push({
			start: statement.start,
			end: statement.end,
			imports: [
				[specifier, flat],
				...(kept.length ? [[source, kept] as [string, string[]]] : [])
			]
		})
	}
	return result
}

const writeImports = (
	imports: Repointed["imports"],
	rename: (specifier: string) => string
) =>
	imports
		.map(
			([specifier, names]) =>
				`import { ${names.join(", ")} } from ${JSON.stringify(rename(specifier))}`
		)
		.join("\n")

interface UnitModule {
	specifier: string
	module: SourceModule
	declarations: Node[]
}

// the code a bundler keeps, as it drops a pure declaration no kept code reads
class KeptCode {
	statements = new Set<Node>()
	private imports = new Set<Binding>()
	private modules: Map<string, SourceModule>
	private referencesIn = new Map<SourceModule, Map<Node, Reference[]>>()
	// spans whose references keep nothing, as the function makes them
	private skipped: ReadonlyMap<SourceModule, readonly Creation[]>

	constructor(
		modules: Map<string, SourceModule>,
		skipped: ReadonlyMap<SourceModule, readonly Creation[]> = new Map()
	) {
		this.modules = modules
		this.skipped = skipped
	}

	keepRead(module: SourceModule, imported?: Set<string> | true): void {
		for (const statement of module.program.body) {
			if (
				statement.type === "ImportDeclaration" ||
				statement.type === "ExportAllDeclaration"
			)
				continue
			if (statement.type === "ExportNamedDeclaration") {
				if (
					statement.declaration &&
					!isPure(statement.declaration, module.source)
				)
					this.keep(module, statement)
				continue
			}
			if (!isPure(statement, module.source)) this.keep(module, statement)
		}
		for (const binding of Object.values(module.scopes.root.bindings)) {
			if (binding.exportNames.some(name => isImported(imported, name)))
				this.keepBinding(module, binding)
		}
	}

	keep(module: SourceModule, statement: Node): void {
		if (this.statements.has(statement)) return
		this.statements.add(statement)
		const skipped = this.skipped.get(module) ?? []
		for (const reference of this.referencesOf(module).get(statement) ?? []) {
			const { start } = reference.id
			if (!skipped.some(span => span.start <= start && start < span.end))
				this.keepBinding(module, reference.binding)
		}
	}

	reads(binding: Binding | undefined): boolean {
		return !!binding && this.imports.has(binding)
	}

	private keepBinding(module: SourceModule, binding: Binding | undefined) {
		if (!binding || binding.scope !== module.scopes.root) return
		if (binding.kind !== "import") {
			this.keep(module, statementOf(binding.declaration))
			return
		}
		if (this.imports.has(binding)) return
		this.imports.add(binding)
		const specifier = binding.declaration
		const source =
			specifier.parent?.type === "ImportDeclaration" ?
				specifier.parent.source.value
			:	undefined
		const target = source === undefined ? undefined : this.modules.get(source)
		if (!target) return
		const exported =
			specifier.type === "ImportSpecifier" ? exportNameOf(specifier.imported)
			: specifier.type === "ImportDefaultSpecifier" ? "default"
			: undefined
		const entry =
			exported === undefined ? undefined : target.scopes.exportsByName[exported]
		if (entry?.kind === "binding") this.keepBinding(target, entry.binding)
		else
			for (const statement of target.program.body) this.keep(target, statement)
	}

	private referencesOf(module: SourceModule): Map<Node, Reference[]> {
		let result = this.referencesIn.get(module)
		if (result) return result
		result = new Map()
		for (const reference of module.scopes.references) {
			const statement = statementOf(reference.id)
			const references = result.get(statement)
			if (references) references.push(reference)
			else result.set(statement, [reference])
		}
		this.referencesIn.set(module, result)
		return result
	}
}

const isImported = (imported: Set<string> | true | undefined, name: string) =>
	imported === true || !!imported?.has(name)

// a unit module declares each value as one const, as isUnitModule checks
const declaredNameOf = (declaration: Node): string =>
	(
		(declaration as Extract<Node, { type: "VariableDeclaration" }>)
			.declarations[0].id as { name: string }
	).name

const isPure = (statement: Node, source: string): boolean => {
	switch (statement.type) {
		case "FunctionDeclaration":
		case "EmptyStatement":
			return true
		case "VariableDeclaration":
			return statement.declarations.every(
				declarator =>
					declarator.id.type === "Identifier" &&
					(!declarator.init || isPureExpression(declarator.init, source))
			)
	}
	return false
}

const isPureExpression = (node: Node, source: string): boolean => {
	node = unwrapExpression(node)
	switch (node.type) {
		case "Literal":
		case "Identifier":
		case "ArrowFunctionExpression":
		case "FunctionExpression":
			return true
		case "TemplateLiteral":
			return node.expressions.every(e => isPureExpression(e, source))
		case "ArrayExpression":
			return node.elements.every(
				e => !e || (e.type !== "SpreadElement" && isPureExpression(e, source))
			)
		// e.g. `schemas = { user: User }`, which a bundler drops with the
		// validators only it reads. A computed key other than a literal may call toString
		case "ObjectExpression":
			return node.properties.every(
				p =>
					p.type === "Property" &&
					(!p.computed || p.key.type === "Literal") &&
					isPureExpression(p.value, source)
			)
		case "CallExpression":
		case "NewExpression":
			return pureAnnotationOf(source, node) !== undefined
	}
	return false
}

// each after those it reads, or undefined where one can't be written into a function
const unitsOf = (
	modules: Record<string, string>,
	parsed: Map<string, SourceModule>,
	kept: KeptCode
): UnitModule[] | undefined => {
	const units = new Map<string, UnitModule>()
	for (const specifier in modules) {
		const module = parsed.get(specifier)!
		const declarations = module.program.body.filter(
			statement =>
				statement.type === "VariableDeclaration" &&
				kept.statements.has(statement)
		)
		if (declarations.length && isUnitModule(module))
			units.set(specifier, { specifier, module, declarations })
	}
	// a module of values, e.g. a template, gains nothing in the function unless
	// a unit there reads it
	const read = new Set(
		[...units.values()]
			.filter(unit => unit.declarations.some(declaresUnit))
			.map(unit => unit.specifier)
	)
	for (const specifier of read) {
		for (const source of importsOf(units.get(specifier)!.module))
			if (units.has(source)) read.add(source)
	}
	for (const specifier of units.keys())
		if (!read.has(specifier)) units.delete(specifier)
	// a unit reading a module other than a unit's can't read it in the function
	for (let dropped = true; dropped; ) {
		dropped = false
		for (const unit of units.values()) {
			if (
				importsOf(unit.module).some(
					source => source !== runtimeSource && !units.has(source)
				)
			) {
				units.delete(unit.specifier)
				dropped = true
			}
		}
	}
	const ordered: UnitModule[] = []
	const state = new Map<string, "visiting" | "done">()
	const visit = (unit: UnitModule): boolean => {
		if (state.get(unit.specifier) === "done") return true
		if (state.get(unit.specifier) === "visiting") return false
		state.set(unit.specifier, "visiting")
		for (const source of importsOf(unit.module)) {
			const read = units.get(source)
			if (read && !visit(read)) return false
		}
		state.set(unit.specifier, "done")
		ordered.push(unit)
		return true
	}
	for (const unit of units.values()) if (!visit(unit)) return
	// two modules declaring a name would declare it twice in one function
	const declared = new Set<string>()
	for (const unit of ordered) {
		for (const name of Object.keys(unit.module.scopes.root.bindings)) {
			const binding = unit.module.scopes.root.bindings[name]
			if (binding.kind === "import") continue
			if (declared.has(name)) return
			declared.add(name)
		}
	}
	return ordered
}

const declaresUnit = (declaration: Node): boolean => {
	const init = (declaration as Extract<Node, { type: "VariableDeclaration" }>)
		.declarations[0].init!
	return (
		init.type === "ArrayExpression" ||
		(init.type === "CallExpression" &&
			(init.callee.type === "Identifier" ||
				(init.callee.type === "ArrowFunctionExpression" &&
					init.callee.params.length > 0)))
	)
}

const runtimeSource = "arktype/runtime"

const importsOf = (module: SourceModule): string[] =>
	module.program.body.flatMap(statement =>
		statement.type === "ImportDeclaration" ? [statement.source.value] : []
	)

// the runtime, units it reads by the names they declare, its declarations and their export
const isUnitModule = (module: SourceModule): boolean =>
	module.program.body.every(statement => {
		switch (statement.type) {
			case "ImportDeclaration":
				return statement.source.value === runtimeSource ?
						statement.specifiers.length === 1 &&
							statement.specifiers[0].type === "ImportNamespaceSpecifier" &&
							statement.specifiers[0].local.name === "runtime"
					:	statement.source.value.startsWith("~arktype/") &&
							statement.specifiers.every(
								specifier =>
									specifier.type === "ImportSpecifier" &&
									exportNameOf(specifier.imported) === specifier.local.name
							)
			case "VariableDeclaration":
				return (
					statement.kind === "const" &&
					statement.declarations.length === 1 &&
					statement.declarations[0].id.type === "Identifier" &&
					!!statement.declarations[0].init
				)
			case "ExportNamedDeclaration":
				return (
					!statement.source &&
					!statement.declaration &&
					statement.specifiers.every(
						specifier =>
							exportNameOf(specifier.exported) === exportNameOf(specifier.local)
					)
				)
		}
		return false
	})

type Call = Extract<Node, { type: "CallExpression" }>
type Arrow = Extract<Node, { type: "ArrowFunctionExpression" }>
type ArrayLiteral = Extract<Node, { type: "ArrayExpression" }>
type Block = Extract<Node, { type: "BlockStatement" }>
type Return = Extract<Node, { type: "ReturnStatement" }>
type Member = { key: { value: number }; value: Node }

type Declaration =
	// a function of the units it reads, called with them
	| {
			kind: "factory"
			name: string
			node: Node
			call: Call
			fn: Arrow
			// a validator a creation returns, rather than functions
			returnsValue: boolean
			// what it's destructured as, if not a unit
			names: string[] | undefined
	  }
	// its functions, e.g. [allows, apply]
	| { kind: "array"; name: string; node: Node; array: ArrayLiteral }
	// a template's functions for its constants
	| { kind: "templateCall"; name: string; node: Node; id: Node; length: number }
	// e.g. a template, a site or a receiver
	| { kind: "value"; name: string; node: Node }

type Factory = Extract<Declaration, { kind: "factory" }>

const roles = ["Allows", "Apply", "Transform"]

interface Flat {
	exported: Set<string>
	// each creation that is its validator's one member
	unwrapped: Set<string>
	code: string
	/** the declaration of the names read */
	write: (read: string[]) => string
	/** that declaration as the flat module, importing the runtime and exporting them */
	writeModule: (read: string[]) => string
}

interface UnitTexts {
	texts: string[]
	specifiersByName: Map<string, string>
	created: Set<string>
}

// each unit's declaration, then each creation's, unless a name is declared twice
const unitTextsOf = (
	units: UnitModule[],
	creations: Creation[]
): UnitTexts | undefined => {
	const specifiersByName = new Map<string, string>()
	const texts: string[] = []
	for (const unit of units) {
		for (const declaration of unit.declarations) {
			texts.push(unit.module.source.slice(declaration.start, declaration.end))
			specifiersByName.set(declaredNameOf(declaration), unit.specifier)
		}
	}
	const created = new Set<string>()
	const creators = new Set<string>()
	for (const { name, creator, shared, args } of creations) {
		if (specifiersByName.has(name) || created.has(name)) return
		created.add(name)
		if (shared && specifiersByName.has(shared)) return
		if (shared && !creators.has(shared)) {
			creators.add(shared)
			texts.push(`const ${shared} = (${creator})`)
		}
		texts.push(
			`const ${name} = ${shared ?? `(${creator})`}(${args.join(", ")})`
		)
	}
	return { texts, specifiersByName, created }
}

const writeFlat = (
	units: UnitModule[],
	creations: Creation[]
): Flat | undefined => {
	const unitTexts = unitTextsOf(units, creations)
	if (!unitTexts) return
	const { texts, specifiersByName, created } = unitTexts
	const inlined = withTemplatesInlined(texts.join("\n"))
	if (!inlined) return
	const { code } = inlined
	// an inlined template is no longer the function's to return
	for (const name of inlined.names) specifiersByName.delete(name)
	const { program, errors } = parseUnits(code)
	if (errors.length) return
	const scopes = new ModuleScopes(program)
	const top = scopes.root.bindings
	const templates = new Map<string, number>()
	const declarations = (program.body as Node[]).map(statement =>
		declarationOf(statement, scopes, templates, created)
	)
	const factories = declarations.filter(
		(d): d is Factory => d.kind === "factory"
	)
	if (!factories.length) return
	const names = new Set<string>()
	const globals = new Set<string>()
	const bindingsNamed = new Map<string, Binding[]>()
	const bindingsIn = new Map<Node, Binding[]>()
	for (const binding of new Set(scopes.bindingsById.values())) {
		names.add(binding.name)
		pushTo(bindingsNamed, binding.name, binding)
		pushTo(bindingsIn, binding.scope.node, binding)
	}
	for (const reference of scopes.references) {
		if (reference.binding) continue
		names.add(reference.id.name)
		globals.add(reference.id.name)
	}
	const values = new Map<string, string>()
	const holders = new Map<string, string>()
	const fresh = (base: string) => {
		let name = base
		for (let i = 1; names.has(name) || values.has(name); i++)
			name = `${base}$${i}`
		names.add(name)
		return name
	}
	const isFree = (name: string) =>
		!values.has(name) && !(name in top) && !globals.has(name)
	// what a factory's parameter reads of the unit it's passed
	const memberReads = new Map<Binding, string>()
	for (const d of factories) {
		for (const [i, param] of d.fn.params.entries()) {
			if (param.type !== "ObjectPattern") continue
			const unit = (d.call.arguments[i] as { name: string }).name
			for (const p of param.properties as never as Member[]) {
				memberReads.set(
					scopes.bindingsById.get(p.value)!,
					`${unit}[${p.key.value}]`
				)
			}
		}
	}
	const membersOf = new Map<string, string[]>()
	const nameMembers = (unit: string, length: number) => {
		const members = Array.from({ length }, (_, i) => {
			const name = `${unit}${roles[i] ?? i}`
			// as the factories reading it name it
			const isRead = (bindingsNamed.get(name) ?? []).every(
				binding => memberReads.get(binding) === `${unit}[${i}]`
			)
			return isRead && isFree(name) ? name : fresh(name)
		})
		for (const member of members) {
			values.set(member, member)
			holders.set(member, member)
		}
		membersOf.set(unit, members)
		return members
	}
	const wholeOf = (unit: string) => `[${membersOf.get(unit)!.join(", ")}]`
	const s = new MagicString(code)
	const replace = (id: Node, text: string) => {
		const parent = id.parent
		const isShorthand =
			parent?.type === "Property" && parent.shorthand && parent.value === id
		s.overwrite(
			id.start,
			id.end,
			isShorthand ? `${(id as { name: string }).name}: ${text}` : text
		)
	}
	const flattenFactory = (d: Factory) => {
		const body = d.fn.body as Block
		const renamed = new Map<Binding, string>()
		let aliases = ""
		// a parameter reads what the function already holds, if no local hides it
		const alias = (binding: Binding, value: string) => {
			if (binding.name === value) return
			// a primitive is written where it's read
			if (
				primitive.test(value) &&
				!binding.writes.length &&
				binding.references.every(
					({ id }) =>
						id.parent?.type !== "MemberExpression" || id.parent.object !== id
				)
			) {
				renamed.set(binding, value)
				return
			}
			// e.g. what a factory flattened before declares
			const holder =
				holders.get(value) ?? (values.get(value) === value ? value : undefined)
			const isHidden = bindingsNamed
				.get(holder!)
				?.some(
					other =>
						other !== binding &&
						d.fn.start <= other.id.start &&
						other.id.start < d.fn.end
				)
			if (holder && !isHidden) {
				if (holder !== binding.name) renamed.set(binding, holder)
				return
			}
			const name = isFree(binding.name) ? binding.name : fresh(binding.name)
			values.set(name, value)
			holders.set(value, name)
			aliases += `const ${name} = ${value}\n`
			if (name !== binding.name) renamed.set(binding, name)
		}
		for (const [i, param] of d.fn.params.entries()) {
			const arg = d.call.arguments[i]
			if (param.type === "Identifier") {
				const value =
					arg.type === "Identifier" && membersOf.has(arg.name) ?
						wholeOf(arg.name)
					:	code.slice(arg.start, arg.end)
				const binding = scopes.bindingsById.get(param)!
				// a runtime value only passed on, e.g. a failure site, needs no constant
				if (
					runtimeMember.test(value) &&
					binding.references.every(
						({ id }) =>
							id.parent?.type === "CallExpression" &&
							id.parent.arguments.includes(id as never)
					)
				)
					renamed.set(binding, value)
				else alias(binding, value)
			} else if (param.type === "ObjectPattern") {
				const unit = (arg as { name: string }).name
				for (const p of param.properties as never as Member[]) {
					alias(
						scopes.bindingsById.get(p.value)!,
						membersOf.get(unit)?.[p.key.value] ?? `${unit}[${p.key.value}]`
					)
				}
			}
		}
		const returned = body.body[body.body.length - 1] as Return
		const returnedLocal =
			d.returnsValue && returned.argument?.type === "Identifier" ?
				scopes.byId.get(returned.argument)?.binding
			:	undefined
		const destructured = new Map<Binding | undefined, string>(
			d.names?.map((name, i) => [
				scopes.byId.get(
					(returned.argument as ArrayLiteral).elements[i] as never
				)?.binding,
				name
			])
		)
		for (const binding of bindingsIn.get(d.fn) ?? []) {
			if (binding.kind === "param") continue
			const name =
				binding === returnedLocal ?
					d.name
				:	(destructured.get(binding) ??
					(isFree(binding.name) ? binding.name : fresh(binding.name)))
			values.set(name, name)
			if (name !== binding.name) renamed.set(binding, name)
		}
		for (const [binding, name] of renamed) {
			const ids = new Set<Node>([
				binding.id,
				...binding.writes,
				...binding.references.map(reference => reference.id)
			])
			for (const id of ids) {
				if (id.start <= body.start) continue
				// terser and swc would inline a function called once
				const isCalled =
					binding.kind === "param" &&
					id.parent?.type === "CallExpression" &&
					id.parent.callee === id
				replace(id, isCalled ? `/* @__NOINLINE__ */ ${name}` : name)
			}
		}
		s.overwrite(d.node.start, body.start + 1, aliases)
		if (returnedLocal || d.names) {
			s.overwrite(returned.start, d.node.end, "")
			return
		}
		if (d.returnsValue) {
			const value = returned.argument!
			s.overwrite(returned.start, value.start, `const ${d.name} = `)
			s.overwrite(value.end, d.node.end, "")
			return
		}
		const elements = (returned.argument as ArrayLiteral).elements as Node[]
		membersOf.set(
			d.name,
			elements.map(e => {
				const binding = scopes.byId.get(e as never)?.binding
				return (binding && renamed.get(binding)) ?? (e as { name: string }).name
			})
		)
		s.overwrite(returned.start, d.node.end, "")
	}
	for (const d of declarations) {
		if (d.kind === "value") {
			values.set(d.name, d.name)
			holders.set(d.name, d.name)
		} else if (d.kind === "templateCall") {
			const members = nameMembers(d.name, d.length)
			s.overwrite(d.id.start, d.id.end, `[${members.join(", ")}]`)
		} else if (d.kind === "array") {
			const elements = d.array.elements as Node[]
			const members = nameMembers(d.name, elements.length)
			s.overwrite(d.node.start, d.array.start + 1, `const ${members[0]} = `)
			for (let i = 1; i < elements.length; i++) {
				const comma = commaBetween(
					code,
					elements[i - 1].end,
					elements[i].start
				)!
				s.overwrite(comma, comma + 1, `, ${members[i]} =`)
			}
			// a trailing comma, as where errors "none" leaves no Apply, would
			// continue the declaration
			const trailing = commaBetween(
				code,
				elements[elements.length - 1].end,
				d.array.end - 1
			)
			s.overwrite(trailing ?? d.array.end - 1, d.array.end, "")
		} else flattenFactory(d)
	}
	// a unit read whole in the function is its members
	const isFactoryArg = spansContaining(factories.flatMap(d => d.call.arguments))
	for (const { id, binding } of scopes.references) {
		if (
			binding?.scope === scopes.root &&
			membersOf.has(binding.name) &&
			!isFactoryArg(id)
		)
			replace(id, wholeOf(binding.name))
	}
	const { body, unwrapped } = withMembersUnwrapped(
		s.toString(),
		Object.fromEntries(
			creations.flatMap(c =>
				c.declared?.memberReads ? [[c.name, c.declared.memberReads.name]] : []
			)
		)
	)
	const exported = new Set<string>()
	for (const [name, specifier] of specifiersByName)
		exported.add(`${specifier}\0${name}`)
	// as measured for size, then written
	const writtenByReturned = new Map<string, WrittenUnits>()
	const flat: Flat = {
		exported,
		unwrapped,
		code: body,
		write: read => {
			const values = read.map(name =>
				membersOf.has(name) ? wholeOf(name) : name
			)
			// one value is returned as itself
			const returned =
				values.length === 1 ? values[0] : `[${values.join(", ")}]`
			let written = writtenByReturned.get(returned)
			if (written === undefined) {
				written = writtenUnitsOf(body, returned)
				writtenByReturned.set(returned, written)
			}
			// swc would inline the IIFE, making its constants module variables
			// V8 doesn't inline calls through
			return `const ${read.length === 1 ? read[0] : `[${read.join(", ")}]`} = /* @__NOINLINE__ */ (() => {
${written.body}
return ${written.returned}
})()`
		},
		writeModule: read => `import * as runtime from "arktype/runtime"

${flat.write(read)}

export { ${read.join(", ")} }
`
	}
	return flat
}

// a validator created as an object of the one member each read reads is that member
const withMembersUnwrapped = (
	code: string,
	readMembers: Record<string, string>
): { body: string; unwrapped: Set<string> } => {
	const unwrapped = new Set<string>()
	if (!Object.keys(readMembers).length) return { body: code, unwrapped }
	const { program } = parseUnits(code)
	const s = new MagicString(code)
	for (const statement of program.body as Node[]) {
		if (statement.type !== "VariableDeclaration") continue
		for (const { id, init } of statement.declarations) {
			const [property] =
				init?.type === "ObjectExpression" && init.properties.length === 1 ?
					init.properties
				:	[]
			if (
				id.type !== "Identifier" ||
				!(id.name in readMembers) ||
				property?.type !== "Property" ||
				property.kind !== "init" ||
				property.method ||
				property.computed ||
				property.key.type !== "Identifier" ||
				property.key.name !== readMembers[id.name]
			)
				continue
			s.overwrite(
				init!.start,
				init!.end,
				code.slice(property.value.start, property.value.end)
			)
			unwrapped.add(id.name)
		}
	}
	return { body: s.toString(), unwrapped }
}

const parseUnits = (code: string) =>
	parseCode("units.js", code, { sourceType: "module", preserveParens: false })

interface ParsedUnits {
	code: string
	program: Program
	scopes: ModuleScopes
}

type UnitsParser = (code: string) => ParsedUnits

// a pass reuses the parse before it where that one changed nothing
const unitsParser = (): UnitsParser => {
	let last: ParsedUnits | undefined
	return code => {
		if (last?.code !== code) {
			const { program } = parseUnits(code)
			last = { code, program, scopes: new ModuleScopes(program) }
		}
		return last
	}
}

interface WrittenUnits {
	body: string
	returned: string
}

const writtenUnitsOf = (body: string, returned: string): WrittenUnits => {
	const parse = unitsParser()
	let written: WrittenUnits = { body, returned }
	for (const pass of [skipAliases, inlineCalls, dropUnread])
		written = untilUnchanged(written, parse, pass)
	written.body = inGzipOrder(written.body)
	return written
}

// an edit of the units' body, parsed with what it returns after a `;`, true
// where it knows running again would change nothing
type UnitsPass = (
	units: ParsedUnits,
	s: MagicString,
	body: string
) => boolean | void

const untilUnchanged = (
	{ body, returned }: WrittenUnits,
	parse: UnitsParser,
	pass: UnitsPass
): WrittenUnits => {
	for (;;) {
		const code = `${body}\n;${returned}`
		const s = new MagicString(code)
		const isSettled = pass(parse(code), s, body)
		if (!s.hasChanged()) return { body, returned }
		returned = s.slice(body.length + 2, code.length)
		body = s.slice(0, body.length)
		if (isSettled) return { body, returned }
	}
}

// a constant declared as another, or a function only forwarding its parameters, is read as that one
const skipAliases: UnitsPass = ({ program, scopes }, s) => {
	for (const statement of program.body as Node[]) {
		if (statement.type !== "VariableDeclaration") continue
		for (const { id, init } of statement.declarations) {
			const binding = scopes.bindingsById.get(id)
			const isAlias = init?.type === "Identifier" && statement.kind === "const"
			const target =
				isAlias ? scopes.byId.get(init)?.binding
				: init ? forwardedOf(init, scopes)
				: undefined
			if (
				!binding ||
				target?.scope !== scopes.root ||
				target.kind !== "const" ||
				target === binding ||
				(!isAlias &&
					!binding.references.every(
						({ id }) =>
							id.parent?.type === "CallExpression" && id.parent.callee === id
					))
			)
				continue
			for (const { id } of binding.references) {
				const parent = id.parent
				s.overwrite(
					id.start,
					id.end,
					parent?.type === "Property" && parent.shorthand ?
						`${binding.name}: ${target.name}`
					:	target.name
				)
			}
		}
	}
}

const forwardedOf = (fn: Node, scopes: ModuleScopes): Binding | undefined => {
	if (fn.type !== "ArrowFunctionExpression" || fn.async) return
	const [only] = fn.body.type === "BlockStatement" ? fn.body.body : []
	const call =
		fn.body.type !== "BlockStatement" ? fn.body
		: fn.body.body.length === 1 && only.type === "ReturnStatement" ?
			only.argument
		:	undefined
	if (
		call?.type !== "CallExpression" ||
		call.callee.type !== "Identifier" ||
		!passesParams(call, fn)
	)
		return
	return scopes.byId.get(call.callee)?.binding
}

// a function read once, as a call passing its own parameters, is its body where it's called
const inlineCalls: UnitsPass = ({ code, program, scopes }, s, body) => {
	const declared = new Map<string, number>()
	for (const { name } of scopes.bindingsById.values())
		declared.set(name, (declared.get(name) ?? 0) + 1)
	// by position, so those within a function are found by search
	let sorted: Reference[] | undefined
	const referencesIn = (fn: Node) => {
		sorted ??= [...scopes.references].sort((l, r) => l.id.start - r.id.start)
		let low = 0
		let high = sorted.length
		while (low < high) {
			const mid = (low + high) >> 1
			if (sorted[mid].id.start < fn.start) low = mid + 1
			else high = mid
		}
		const result: Reference[] = []
		for (let i = low; i < sorted.length && sorted[i].id.start < fn.end; i++)
			result.push(sorted[i])
		return result
	}
	const readsAlike = (fn: Node) =>
		referencesIn(fn).every(
			({ id, binding }) =>
				id.end > fn.end ||
				(binding?.declaration === fn ? !binding.writes.length
				: binding && binding.id.start > fn.start && binding.id.end < fn.end ?
					binding.kind !== "var"
				:	(declared.get(id.name) ?? 0) <= 1)
		)
	// each inline reads the code as parsed, so no other may touch its span
	const edited: [start: number, end: number][] = []
	const isEdited = (start: number, end: number) =>
		edited.some(span => start < span[1] && span[0] < end)
	for (const statement of program.body as Node[]) {
		if (statement.type !== "VariableDeclaration") continue
		const { declarations } = statement
		for (const [i, { id, init: fn }] of declarations.entries()) {
			const references = scopes.bindingsById.get(id)?.references ?? []
			const call = references[0]?.id.parent
			if (
				fn?.type !== "ArrowFunctionExpression" ||
				fn.async ||
				references.length !== 1 ||
				call?.type !== "CallExpression" ||
				call.callee !== references[0].id ||
				(call.start > fn.start && call.end < fn.end) ||
				!passesParams(call, fn) ||
				!readsAlike(fn)
			)
				continue
			const [replaced, text] =
				fn.body.type !== "BlockStatement" ?
					[call, `(${code.slice(fn.body.start, fn.body.end)})`]
				: (
					call.parent?.type === "ReturnStatement" &&
					fn.body.body[fn.body.body.length - 1]?.type === "ReturnStatement"
				) ?
					[call.parent, code.slice(fn.body.start, fn.body.end)]
				:	[]
			if (!replaced) continue
			const [start, end] =
				declarations.length === 1 ?
					[statement.start, statementEndIn(body, statement)]
				: i < declarations.length - 1 ?
					[declarations[i].start, declarations[i + 1].start]
				:	[declarations[i - 1].end, declarations[i].end]
			if (isEdited(replaced.start, replaced.end) || isEdited(start, end))
				continue
			edited.push([replaced.start, replaced.end], [start, end])
			s.overwrite(replaced.start, replaced.end, text!)
			s.remove(start, end)
			break
		}
	}
}

// the last statement's span takes in the `;` and return the pass appends
const statementEndIn = (body: string, statement: Node): number =>
	Math.min(statement.end, body.length)

const passesParams = (
	call: Node & { type: "CallExpression" },
	fn: Node & { type: "ArrowFunctionExpression" }
) =>
	call.arguments.length === fn.params.length &&
	fn.params.every(
		(param, i) =>
			param.type === "Identifier" &&
			call.arguments[i].type === "Identifier" &&
			(call.arguments[i] as { name: string }).name === param.name
	)

// a bundler drops only a module's unread declarations, not a function's
const dropUnread: UnitsPass = ({ code, program, scopes }, s, body) => {
	const dropped: Node[] = []
	// dropped once nothing reads them
	const droppable: Binding[] = []
	for (const statement of program.body as Node[]) {
		if (statement.type !== "VariableDeclaration") continue
		const { declarations } = statement
		const unread = declarations.map(declarator => {
			const binding =
				declarator.id.type === "Identifier" ?
					scopes.bindingsById.get(declarator.id)
				:	undefined
			if (
				!binding ||
				(declarator.init && !isPureExpression(declarator.init, code))
			)
				return false
			if (binding.references.length) {
				droppable.push(binding)
				return false
			}
			// a name declared again is bound by its next declaration
			if (binding.writes.length) droppable.push(binding)
			dropped.push(declarator)
			return true
		})
		if (unread.every(Boolean))
			s.remove(statement.start, statementEndIn(body, statement))
		else if (unread.some(Boolean)) {
			const kept = declarations.filter((_, i) => !unread[i])
			s.overwrite(
				statement.start,
				statementEndIn(body, statement),
				`${statement.kind} ${kept.map(d => code.slice(d.start, d.end)).join(", ")}`
			)
		}
	}
	// settled unless a declaration was read only by those dropped
	const isDropped = spansContaining(dropped)
	return !droppable.some(binding =>
		binding.references.every(({ id }) => isDropped(id))
	)
}

const pureAnnotation = /^\s*[#@]__PURE__\s*$/

// functions first and beside those like them, so gzip finds their repeats,
// where there are enough to pay; without annotations, as a bundler keeps the
// call anyway, and oxc's minifier keeps their bytes
const inGzipOrder = (body: string): string => {
	const { program, comments } = parseUnits(body)
	const annotations = comments.filter(comment =>
		pureAnnotation.test(comment.value)
	)
	let next = 0
	// read in order, each span after the last
	const textOf = (start: number, end: number) => {
		while (next < annotations.length && annotations[next].start < start) next++
		let text = ""
		for (; next < annotations.length && annotations[next].end <= end; next++) {
			text += body.slice(start, annotations[next].start)
			start = annotations[next].end
		}
		return text + body.slice(start, end)
	}
	const functions: [key: string, text: string][] = []
	const rest: string[] = []
	for (const statement of program.body as Node[]) {
		if (statement.type !== "VariableDeclaration") {
			rest.push(textOf(statement.start, statement.end))
			continue
		}
		for (const declarator of statement.declarations) {
			const text = `${statement.kind} ${textOf(declarator.start, declarator.end)}`
			const { init } = declarator
			if (
				init?.type === "ArrowFunctionExpression" ||
				init?.type === "FunctionExpression"
			) {
				functions.push([
					body.slice(init.start, init.end).replace(unitName, "_"),
					text
				])
			} else rest.push(text)
		}
	}
	if (functions.length < minSortedFunctions) {
		next = 0
		return textOf(0, body.length)
	}
	functions.sort(([l], [r]) =>
		l < r ? -1
		: l > r ? 1
		: 0
	)
	return [...functions.map(([, text]) => text), ...rest].join("\n")
}

const minSortedFunctions = 64

const runtimeMember = /^runtime\.\w+$/

const primitive =
	/^(?:\d[\d+.e]*|"(?:[^\n"\\]|\\.)*"|true|false|null|undefined)$/

const unitName = /\b\w+?(?:R\d+|Allows|Apply|Transform)\b/g

const declarationOf = (
	statement: Node,
	scopes: ModuleScopes,
	templates: Map<string, number>,
	created: ReadonlySet<string>
): Declaration => {
	const { id, init } = (
		statement as Extract<Node, { type: "VariableDeclaration" }>
	).declarations[0]
	const name = (id as { name: string }).name
	const node = statement
	switch (init!.type) {
		case "ArrayExpression":
			if (
				init!.elements.length &&
				init!.elements.every(
					e =>
						e?.type === "ArrowFunctionExpression" ||
						e?.type === "FunctionExpression"
				)
			)
				return { kind: "array", name, node, array: init! }
			break
		case "ArrowFunctionExpression":
		case "FunctionExpression": {
			const length = returnedLengthOf(init!)
			if (length) templates.set(name, length)
			break
		}
		case "CallExpression": {
			const callee = init!.callee
			if (callee.type === "Identifier") {
				const length = templates.get(callee.name)
				if (length) return { kind: "templateCall", name, node, id, length }
			} else if (
				callee.type === "ArrowFunctionExpression" &&
				isFactory(init!, callee, scopes, created.has(name))
			) {
				// e.g. a template called once, inlined as its call's function
				const names =
					id.type === "ArrayPattern" ?
						id.elements.map(e => (e?.type === "Identifier" ? e.name : ""))
					:	undefined
				if (!names || namesReturnedLocals(names, callee, scopes)) {
					return {
						kind: "factory",
						name: names ? names.join(", ") : name,
						node,
						call: init!,
						fn: callee,
						returnsValue: created.has(name),
						names
					}
				}
			}
		}
	}
	return { kind: "value", name, node }
}

// a template called once becomes its call's function, flattened as a factory
const withTemplatesInlined = (
	code: string
): { code: string; names: string[] } | undefined => {
	const { program, errors } = parseUnits(code)
	if (errors.length) return
	const scopes = new ModuleScopes(program)
	const s = new MagicString(code)
	const names: string[] = []
	for (const statement of program.body as Node[]) {
		if (
			statement.type !== "VariableDeclaration" ||
			statement.declarations.length !== 1
		)
			continue
		const { id, init: fn } = statement.declarations[0]
		if (fn?.type !== "ArrowFunctionExpression" || !returnedLengthOf(fn))
			continue
		const references = scopes.bindingsById.get(id)?.references ?? []
		const callee = references[0]?.id
		const call = callee?.parent
		const declarator = call?.parent
		if (
			references.length === 1 &&
			call?.type === "CallExpression" &&
			call.callee === callee &&
			declarator?.type === "VariableDeclarator" &&
			declarator.init === call &&
			(declarator.id.type === "Identifier" ||
				declarator.id.type === "ArrayPattern") &&
			statementOf(declarator).parent?.type === "Program"
		) {
			s.overwrite(callee.start, callee.end, `(${code.slice(fn.start, fn.end)})`)
			s.remove(statement.start, statement.end)
			names.push((id as { name: string }).name)
		}
	}
	return { code: s.toString(), names }
}

const namesReturnedLocals = (
	names: string[],
	fn: Arrow,
	scopes: ModuleScopes
): boolean => {
	if (!names.every(Boolean) || names.length !== returnedLengthOf(fn))
		return false
	const body = (fn.body as Block).body
	const returned = (body[body.length - 1] as Return).argument as ArrayLiteral
	const bindings = returned.elements.map(
		e => scopes.byId.get(e as never)?.binding
	)
	return (
		new Set(bindings).size === bindings.length &&
		bindings.every(binding => binding?.scope.node === fn)
	)
}

const returnedLengthOf = (fn: Node): number | undefined => {
	if (
		(fn.type !== "ArrowFunctionExpression" &&
			fn.type !== "FunctionExpression") ||
		fn.body?.type !== "BlockStatement"
	)
		return
	const returned = fn.body.body[fn.body.body.length - 1] as Node | undefined
	if (
		returned?.type !== "ReturnStatement" ||
		returned.argument?.type !== "ArrayExpression" ||
		!returned.argument.elements.every(e => e?.type === "Identifier")
	)
		return
	return returned.argument.elements.length
}

const isFactory = (
	call: Call,
	fn: Arrow,
	scopes: ModuleScopes,
	returnsValue: boolean
): boolean => {
	if (fn.async || (!returnsValue && !returnedLengthOf(fn))) return false
	let params = fn.params as Node[]
	const rest = params[params.length - 1] as Node | undefined
	if (rest?.type === "RestElement") {
		if (scopes.bindingsById.get(rest.argument)?.references.length) return false
		params = params.slice(0, -1)
	}
	if (call.arguments.length !== params.length) return false
	const isFlat = params.every((param, i) => {
		const arg = call.arguments[i]
		if (arg.type === "SpreadElement") return false
		if (param.type === "Identifier") return true
		return (
			param.type === "ObjectPattern" &&
			arg.type === "Identifier" &&
			param.properties.every(
				p =>
					p.type === "Property" &&
					!p.computed &&
					p.key.type === "Literal" &&
					typeof p.key.value === "number" &&
					p.value.type === "Identifier"
			)
		)
	})
	if (!isFlat) return false
	// its body runs as the function's, so it can return only at its end
	let returns = 0
	walk(fn.body, node => {
		if (node.type === "ReturnStatement") returns++
		return node === fn.body || !isFunction(node)
	})
	return returns === 1
}

const isFunction = (node: Node) =>
	node.type === "ArrowFunctionExpression" ||
	node.type === "FunctionExpression" ||
	node.type === "FunctionDeclaration" ||
	node.type === "ClassExpression" ||
	node.type === "ClassDeclaration"

// a token can't run across the text between two spans
const spansContaining = (
	spans: readonly Span[]
): ((token: Span) => boolean) => {
	const union: Span[] = []
	for (const span of [...spans].sort((l, r) => l.start - r.start)) {
		const last = union[union.length - 1]
		if (last && span.start <= last.end) last.end = Math.max(last.end, span.end)
		else union.push({ start: span.start, end: span.end })
	}
	return token => {
		let low = 0
		let high = union.length - 1
		while (low <= high) {
			const mid = (low + high) >> 1
			if (union[mid].end < token.end) low = mid + 1
			else if (union[mid].start > token.start) high = mid - 1
			else return true
		}
		return false
	}
}

const pushTo = <k, v>(map: Map<k, v[]>, key: k, value: v) => {
	const values = map.get(key)
	if (values) values.push(value)
	else map.set(key, [value])
}

// the comma separating two elements, past their parentheses and comments
const commaBetween = (
	code: string,
	start: number,
	end: number
): number | undefined => {
	for (let i = start; i < end; i++) {
		if (code[i] === ",") return i
		if (code.startsWith("/*", i)) i = code.indexOf("*/", i + 2) + 1
		else if (code.startsWith("//", i)) i = code.indexOf("\n", i)
	}
}

// every export of an entry is read
export const importedNamesOf = (
	modules: Iterable<SourceModule>,
	entries: Iterable<string>,
	resolve: (specifier: string, importer: string) => string | undefined
): ImportedNames => {
	const result: ImportedNames = new Map()
	const add = (target: string | undefined, name: string | true) => {
		if (target === undefined) return
		const names = result.get(target)
		if (names === true) return
		if (name === true) result.set(target, true)
		else if (names) names.add(name)
		else result.set(target, new Set([name]))
	}
	for (const entry of entries) add(entry, true)
	for (const module of modules) {
		const targetOf = (specifier: string) => resolve(specifier, module.id)
		for (const statement of module.program.body) {
			if (statement.type === "ImportDeclaration") {
				const target = targetOf(statement.source.value)
				for (const specifier of statement.specifiers) {
					add(
						target,
						specifier.type === "ImportSpecifier" ?
							exportNameOf(specifier.imported)
						: specifier.type === "ImportDefaultSpecifier" ? "default"
						: true
					)
				}
			} else if (statement.type === "ExportNamedDeclaration") {
				if (!statement.source) continue
				const target = targetOf(statement.source.value)
				for (const specifier of statement.specifiers)
					add(target, exportNameOf(specifier.local))
			} else if (statement.type === "ExportAllDeclaration")
				add(targetOf(statement.source.value), true)
			else if (
				statement.type === "TSImportEqualsDeclaration" &&
				statement.moduleReference.type === "TSExternalModuleReference"
			)
				add(targetOf(statement.moduleReference.expression.value), true)
		}
		// e.g. import() or require(), reading every export
		walk(module.program, node => {
			const read = loadedSourceOf(node)
			if (read?.type === "Literal" && typeof read.value === "string")
				add(targetOf(read.value), true)
			return true
		})
	}
	return result
}
