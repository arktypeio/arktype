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
}

export interface LinkedCode {
	code: string
	// to the code it was given, for a site module it changed
	map: SourceMap | undefined
}

// a bundle's precompiled modules with each checker the bundle reads once
// written where it's read, as a unit of its own costs its name twice. Each
// module it changes is renamed for what it holds, and the original is kept,
// so a module the bundle loads unlinked reads what it always did
export const linkBundle = (
	sites: Record<string, LinkedSite>,
	modules: Record<string, string>
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
	linker.link(true)
	codes = linker.codes()
	const renamed = renamedOf(codes, modules)
	if (!renamed) return
	const linked: LinkedBundle = { sites: {}, modules: {} }
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

class Linker {
	private units: Unit[] = []
	private unitsByKey = new Map<string, Unit>()
	private readsByBinding = new Map<Binding, Read[]>()
	private ownerByBinding = new Map<Binding, Unit>()

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

	// whether it wrote any checker where it's read, in sites or other units
	link(intoSites: boolean): boolean {
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
		// a declaration written into can't be copied before it's read again
		const written = new Set<Node>()
		let linked = false
		for (const [binding, reads] of this.readsByBinding) {
			if (reads.length !== 1) continue
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
			if (local !== id.name) text.overwrite(id.start, id.end, local)
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
		for (const [local, statement] of imports) {
			read.unit.importsByLocal.set(local, statement)
			read.unit.added.push(statement)
		}
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
