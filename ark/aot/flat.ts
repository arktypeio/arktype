import { hashOf } from "@ark/util"
import MagicString, { type SourceMap } from "magic-string"
import { parseSync, type Node } from "oxc-parser"
import { renamedOf } from "./link.ts"
import { SourceModule } from "./module.ts"
import { minifiedLengthOf } from "./runtimeSize.ts"
import {
	exportNameOf,
	ModuleScopes,
	walk,
	type Binding,
	type Reference
} from "./scope.ts"

export interface FlatBundle {
	sites: Record<string, FlatSite>
	modules: Record<string, string>
	// what a module reading one of these would read a copy of
	replaced: string[]
}

export interface FlatSite {
	code: string
	// to the code it was given, for a site module it changed
	map: SourceMap | undefined
}

// the names some module of a bundle may import of each module, true for any
export type ImportedNames = Map<string, Set<string> | true>

// A bundle written as one chunk declares the units its kept validators read
// in one function, so that a traversal calls another through a constant of
// that function, which V8 inlines, as it does a factory's parameter, rather
// than through a module variable, which it doesn't once a bundler writes a
// constant as a var. It saves each unit its factory. Every other module is
// kept, so code the bundle reads other than as its scan saw links as before.
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
	// what reads a flattened unit reads it from the function's module, except
	// what only a creation the function makes in its place read
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
		...creations.map(creation => creation.creator)
	]
	if (
		whereSmaller &&
		minifiedLengthOf(flat.write([...read], false)) >=
			minifiedLengthOf(unflattened.join("\n"))
	)
		return
	const codes: Record<string, string> = { ...modules }
	for (const key of flattened) delete codes[key]
	codes[specifier] = flat.write([...read], true)
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
		let s = edit(id, rename)
		const created = creationsBySite.get(id) ?? []
		for (const [start, end] of keptAnnotationsIn(parsed.get(id)!, kept)) {
			if (
				created.some(creation => creation.start <= start && end <= creation.end)
			)
				continue
			s ??= new MagicString(sites[id])
			s.remove(start, end)
		}
		for (const { start, end, name, declared } of created) {
			s ??= new MagicString(sites[id])
			const source = JSON.stringify(rename(specifier))
			// a declaration of it alone is an import, which a bundler doesn't
			// write as a variable holding another
			if (declared) {
				s.overwrite(
					declared.start,
					declared.end,
					`import { ${name} as ${declared.name} } from ${source}\n${declared.exported ? `export { ${declared.name} }\n` : ""}`
				)
			} else {
				s.overwrite(start, end, `$ark_${name}`)
				s.prepend(`import { ${name} as $ark_${name} } from ${source}\n`)
			}
		}
		bundle.sites[id] =
			s ?
				{ code: s.toString(), map: s.generateMap({ hires: "boundary" }) }
			:	{ code: sites[id], map: undefined }
	}
	return bundle
}

const unrenamed = (specifier: string) => specifier

// a validator a site creates in place by calling a creator nothing else
// calls, with units the function declares, which the function creates in its
// place, so its creator's body reads them as its constants
interface Creation {
	// the call's span, with its annotation
	start: number
	end: number
	// what the function returns it as
	name: string
	// the creator's function, which the function calls
	creator: string
	args: string[]
	// the declaration it's all of, which an import of it can replace
	declared:
		| { start: number; end: number; name: string; exported: boolean }
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
	// the module declaring what an import reads, and its name there
	const originOf = (
		module: SourceModule,
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
				originOf(target!, entry.binding)
			:	[source, entry.binding.name]
	}
	const callsOf = new Map<string, number>()
	for (const module of parsed.values()) {
		for (const binding of Object.values(module.scopes.root.bindings)) {
			const origin = originOf(module, binding)
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
	for (const id in sites) {
		const module = parsed.get(id)!
		const creations: Creation[] = []
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
				if (
					call?.type !== "CallExpression" ||
					call.callee.type !== "Identifier" ||
					!call.arguments.length ||
					!call.arguments.every(arg => arg.type === "Identifier")
				)
					continue
				// a creation the precompiler marks pure runs the same anywhere
				const annotation = module.source
					.slice(Math.max(0, call.start - 32), call.start)
					.match(pureAnnotated)
				if (!annotation) continue
				const bindingOf = (id: Node) =>
					module.scopes.root.bindings[(id as { name: string }).name]
				const creator = originOf(module, bindingOf(call.callee))
				const args = call.arguments.map(arg => originOf(module, bindingOf(arg)))
				const fn = creator && creatorFnOf(parsed.get(creator[0])!)
				if (
					!fn ||
					callsOf.get(creator.join("\0")) !== 1 ||
					!args.every(
						arg =>
							arg &&
							declaredIn
								.get(arg[0])
								?.declarations.some(d => declaredNames(d).includes(arg[1]))
					)
				)
					continue
				const [declarator] = declaration.declarations
				creations.push({
					start: call.start - annotation[0].length,
					end: call.end,
					name: `${creator[1]}Validator`,
					creator: fn,
					args: args.map(arg => arg![1]),
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
								exported: statement !== declaration
							}
						:	undefined
				})
			}
		}
		if (creations.length) result.set(id, creations)
	}
	return result
}

// a creator's function, if it reads only units and runtime members that
// don't change after its module loads, as configuration may
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
	const init = unwrapParentheses(declarations[0].declarations[0].init!)
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

// the annotations of the creations a site declares that kept code reads, which
// a bundler keeps anyway, as oxc's minifier keeps their annotations
const keptAnnotationsIn = (
	module: SourceModule,
	kept: KeptCode
): [start: number, end: number][] => {
	const result: [number, number][] = []
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
			if (call?.type !== "CallExpression") continue
			const before = module.source.slice(
				Math.max(0, call.start - 32),
				call.start
			)
			const annotation = before.match(pureAnnotated)
			if (annotation)
				result.push([call.start - annotation[0].length, call.start])
		}
	}
	return result
}

// e.g. `type({ ... }) satisfies Type<Data>`, which runs as its expression
const unwrapExpression = (node: Node): Node =>
	(
		node.type === "ParenthesizedExpression" ||
		node.type === "TSSatisfiesExpression" ||
		node.type === "TSAsExpression" ||
		node.type === "TSNonNullExpression"
	) ?
		unwrapExpression(node.expression)
	:	node

// an import of units rewritten, each name read from the function's module
// if it's there, else from the unit's own
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
			// an import nothing kept reads, e.g. of a validator the bundle
			// drops, links to the unit's own module, so the function needn't
			// return it
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

const virtualSource = /"(~arktype\/[^"]+)"/g

// a module a bundle keeps of its units, and the declarations it keeps
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

	// what runs as it loads, and each export another module may import
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

const declaredNames = (declaration: Node): string[] =>
	declaration.type === "VariableDeclaration" ?
		declaration.declarations.flatMap(declarator =>
			declarator.id.type === "Identifier" ? [declarator.id.name] : []
		)
	: (
		(declaration.type === "FunctionDeclaration" ||
			declaration.type === "ClassDeclaration") &&
		declaration.id
	) ?
		[declaration.id.name]
	:	[]

// whether a bundler may drop a statement no kept code reads
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
	switch (node.type) {
		case "Literal":
		case "Identifier":
		case "ArrowFunctionExpression":
		case "FunctionExpression":
			return true
		case "ParenthesizedExpression":
			return isPureExpression(node.expression, source)
		case "TemplateLiteral":
			return node.expressions.every(e => isPureExpression(e, source))
		case "ArrayExpression":
			return node.elements.every(
				e => !e || (e.type !== "SpreadElement" && isPureExpression(e, source))
			)
		case "CallExpression":
		case "NewExpression":
			return pureAnnotated.test(
				source.slice(Math.max(0, node.start - 32), node.start)
			)
	}
	return false
}

const pureAnnotated = /\/\*\s*[#@]__PURE__\s*\*\/\s*$/

const statementOf = (node: Node): Node => {
	while (node.parent && node.parent.type !== "Program") node = node.parent
	return node
}

// the modules of units a bundle keeps, each after those it reads, or
// undefined where one can't be written into a function
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
	// a module of values, e.g. a template or a creator, gains nothing in the
	// function unless a unit there reads it
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

// whether it declares a unit's functions, rather than a value
const declaresUnit = (declaration: Node): boolean => {
	const init = unwrapParentheses(
		(declaration as Extract<Node, { type: "VariableDeclaration" }>)
			.declarations[0].init!
	)
	return (
		init.type === "ArrayExpression" ||
		(init.type === "CallExpression" &&
			(init.callee.type === "Identifier" ||
				(init.callee.type === "ArrowFunctionExpression" &&
					init.callee.params.length > 0)))
	)
}

const unwrapParentheses = (node: Node): Node =>
	node.type === "ParenthesizedExpression" ?
		unwrapParentheses(node.expression)
	:	node

const runtimeSource = "arktype/runtime"

const importsOf = (module: SourceModule): string[] =>
	module.program.body.flatMap(statement =>
		statement.type === "ImportDeclaration" ? [statement.source.value] : []
	)

// a module the standalone build writes of a unit: the runtime, units it
// reads by the names they declare, its declarations and their export
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

// a unit's declaration, as the function declares it
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
	// each unit's declaration a module outside the function may read
	exported: Set<string>
	code: string
	write: (read: string[], asModule: boolean) => string
}

// the units' declarations in one function, returning what's read outside it
const writeFlat = (
	units: UnitModule[],
	creations: Creation[]
): Flat | undefined => {
	const specifiersByName = new Map<string, string>()
	const texts: string[] = []
	for (const unit of units) {
		for (const declaration of unit.declarations) {
			texts.push(unit.module.source.slice(declaration.start, declaration.end))
			for (const name of declaredNames(declaration))
				specifiersByName.set(name, unit.specifier)
		}
	}
	const created = new Set<string>()
	for (const { name, creator, args } of creations) {
		if (specifiersByName.has(name) || created.has(name)) return
		created.add(name)
		texts.push(`const ${name} = (${creator})(${args.join(", ")})`)
	}
	const inlined = withTemplatesInlined(texts.join("\n"))
	if (!inlined) return
	const { code } = inlined
	// an inlined template is no longer the function's to return
	for (const name of inlined.names) specifiersByName.delete(name)
	const { program, errors } = parseSync("units.js", code, {
		sourceType: "module",
		preserveParens: false
	})
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
	// what each name the function declares holds
	const values = new Map<string, string>()
	// the name the function declares holding each value
	const holders = new Map<string, string>()
	const fresh = (base: string) => {
		let name = base
		for (let i = 1; names.has(name) || values.has(name); i++)
			name = `${base}$${i}`
		names.add(name)
		return name
	}
	// a name that wouldn't hide what the function's code reads
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
				// a runtime value the code only passes on, e.g. a failure site, is
				// read where it's passed, as no call through it needs a constant
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
		// a creation is the local its creator returns, if it returns one
		const returnedLocal =
			d.returnsValue && returned.argument?.type === "Identifier" ?
				scopes.refsById.get(returned.argument)?.binding
			:	undefined
		// what a destructured call returns is named as it's destructured
		const destructured = new Map<Binding | undefined, string>(
			d.names?.map((name, i) => [
				scopes.refsById.get(
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
			for (const id of ids) if (id.start > body.start) replace(id, name)
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
				const binding = scopes.refsById.get(e as never)?.binding
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
				const comma = commaBetween(code, elements[i - 1].end, elements[i].start)
				s.overwrite(comma, comma + 1, `, ${members[i]} =`)
			}
			s.overwrite(d.array.end - 1, d.array.end, "")
		} else flattenFactory(d)
	}
	// a unit read whole in the function is its members
	for (const { id, binding } of scopes.references) {
		if (
			binding?.scope === scopes.root &&
			membersOf.has(binding.name) &&
			!isFactoryArg(id, factories)
		)
			replace(id, wholeOf(binding.name))
	}
	const body = s.toString()
	const exported = new Set<string>()
	for (const [name, specifier] of specifiersByName)
		exported.add(`${specifier}\0${name}`)
	return {
		exported,
		code: body,
		write: (read, asModule) => {
			const values = read.map(name =>
				membersOf.has(name) ? wholeOf(name) : name
			)
			// one value is returned as itself
			const returned =
				values.length === 1 ? values[0] : `[${values.join(", ")}]`
			// kept code reads what it returns, so a bundler keeps its call, and
			// annotations saying it could drop it are bytes oxc's minifier keeps
			const declaration = `const ${read.length === 1 ? read[0] : `[${read.join(", ")}]`} = (() => {
${withoutAnnotations(inGzipOrder(withoutUnread(body, returned)))}
return ${returned}
})()`
			return asModule ?
					`import * as runtime from "arktype/runtime"

${declaration}

export { ${read.join(", ")} }
`
				:	declaration
		}
	}
}

// what a function declares that nothing reads, which a bundler keeps as it
// drops only a module's declarations, left out, as is what only it read
const withoutUnread = (body: string, returned: string): string => {
	for (;;) {
		const code = `${body}\n;${returned}`
		const { program } = parseSync("units.js", code, {
			sourceType: "module",
			preserveParens: false
		})
		const scopes = new ModuleScopes(program)
		const s = new MagicString(code)
		for (const statement of program.body as Node[]) {
			if (statement.type !== "VariableDeclaration") continue
			const { declarations } = statement
			const unread = declarations.map(declarator => {
				const binding =
					declarator.id.type === "Identifier" ?
						scopes.bindingsById.get(declarator.id)
					:	undefined
				return (
					!!binding &&
					!binding.references.length &&
					(!declarator.init || isPureExpression(declarator.init, code))
				)
			})
			if (unread.every(Boolean)) s.remove(statement.start, statement.end)
			else if (unread.some(Boolean)) {
				const kept = declarations.filter((_, i) => !unread[i])
				s.overwrite(
					statement.start,
					statement.end,
					`${statement.kind} ${kept.map(d => code.slice(d.start, d.end)).join(", ")}`
				)
			}
		}
		if (!s.hasChanged()) return body
		body = s.toString().slice(0, -returned.length - 2)
	}
}

const withoutAnnotations = (body: string): string => {
	const { comments } = parseSync("units.js", body, { sourceType: "module" })
	const s = new MagicString(body)
	for (const comment of comments)
		if (pureAnnotation.test(comment.value)) s.remove(comment.start, comment.end)
	return s.toString()
}

const pureAnnotation = /^\s*[#@]__PURE__\s*$/

// each function the units declare, which reads nothing as it's declared, first
// and beside those like it, so gzip finds their repeats, then the rest in
// order, where there are enough for the order to pay rather than move gzip
// either way
const inGzipOrder = (body: string): string => {
	const { program } = parseSync("units.js", body, {
		sourceType: "module",
		preserveParens: false
	})
	const functions: [key: string, text: string][] = []
	const rest: string[] = []
	for (const statement of program.body as Node[]) {
		if (statement.type !== "VariableDeclaration") {
			rest.push(body.slice(statement.start, statement.end))
			continue
		}
		for (const declarator of statement.declarations) {
			const text = `${statement.kind} ${body.slice(declarator.start, declarator.end)}`
			const init = declarator.init && unwrapParentheses(declarator.init)
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
	if (functions.length < minSortedFunctions) return body
	functions.sort(([l], [r]) =>
		l < r ? -1
		: l > r ? 1
		: 0
	)
	return [...functions.map(([, text]) => text), ...rest].join("\n")
}

const minSortedFunctions = 64

const runtimeMember = /^runtime\.\w+$/

// a name the build derives from a unit's, e.g. its Allows
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

// a template called once as its call's function, which the function then
// flattens as a factory, so what it's called with is the function's constant
const withTemplatesInlined = (
	code: string
): { code: string; names: string[] } | undefined => {
	const { program, errors } = parseSync("units.js", code, {
		sourceType: "module",
		preserveParens: false
	})
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
		const { id, init } = statement.declarations[0]
		const fn = init && unwrapParentheses(init)
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

// whether a function returns as many distinct locals as names destructure it
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
		e => scopes.refsById.get(e as never)?.binding
	)
	return (
		new Set(bindings).size === bindings.length &&
		bindings.every(binding => binding?.scope.node === fn)
	)
}

// how many functions a template or factory returns, by name
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

const isFactoryArg = (node: Node, factories: Factory[]): boolean =>
	factories.some(d =>
		d.call.arguments.some(arg => arg.start <= node.start && node.end <= arg.end)
	)

const pushTo = <k, v>(map: Map<k, v[]>, key: k, value: v) => {
	const values = map.get(key)
	if (values) values.push(value)
	else map.set(key, [value])
}

// the comma separating two elements, past their parentheses and comments
const commaBetween = (code: string, start: number, end: number): number => {
	for (let i = start; i < end; i++) {
		if (code[i] === ",") return i
		if (code.startsWith("/*", i)) i = code.indexOf("*/", i + 2) + 1
		else if (code.startsWith("//", i)) i = code.indexOf("\n", i)
	}
	throw new Error(`Expected a comma between ${start} and ${end}`)
}

// the names each module of a bundle may have read of it by another, from its
// imports, as every export of an entry is read
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
			const read =
				node.type === "ImportExpression" ? node.source
				: (
					node.type === "CallExpression" &&
					node.callee.type === "Identifier" &&
					node.callee.name === "require"
				) ?
					node.arguments[0]
				:	undefined
			if (read?.type === "Literal" && typeof read.value === "string")
				add(targetOf(read.value), true)
			return true
		})
	}
	return result
}
