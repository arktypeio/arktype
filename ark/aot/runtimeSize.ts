import type { StandaloneModules } from "arktype/internal/standalone.ts"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { visitorKeys, type Node } from "oxc-parser"
import { SourceModule } from "./module.ts"
import { typeKeys, type Binding } from "./scope.ts"
import { minifiedLengthOf, runtimeReadsOf } from "./smaller.ts"

// resolved as the precompiler's own arktype resolves it
let runtimeFile: string | undefined

const runtimeFileOf = () =>
	(runtimeFile ??= fileOf("arktype/runtime", import.meta.url))

/** about the length a minifier leaves of modules and the runtime they read */
export const minifiedSizeOf = ({
	code,
	modules
}: StandaloneModules): number => {
	const text = [code, ...Object.values(modules)].join("\n")
	return (
		minifiedLengthOf(text) +
		reachedLengthOf(runtimeFileOf(), runtimeReadsOf(text))
	)
}

/**
 * about the length a minifier leaves of the declarations a module's exports
 * reach through its imports, private helpers too, each counted once
 */
export const reachedLengthOf = (
	file: string | undefined,
	names: Iterable<string>
): number => {
	let length = 0
	for (const declared of reachedBy(file, names)) length += declared.length
	return length
}

export interface RuntimeReaches {
	lengths: number[]
	// the indices of the lengths each export reaches
	reached: Record<string, number[]>
}

/** what minifiedSizeOf counts of the runtime, for code that can't read it */
export const runtimeReachesOf = (names: Iterable<string>): RuntimeReaches => {
	const indices = new Map<Declared, number>()
	const lengths: number[] = []
	const reached: Record<string, number[]> = {}
	for (const name of names) {
		reached[name] = [...reachedBy(runtimeFileOf(), [name])].map(declared => {
			let index = indices.get(declared)
			if (index === undefined)
				indices.set(declared, (index = lengths.push(declared.length) - 1))
			return index
		})
	}
	return { lengths, reached }
}

const reachedBy = (
	file: string | undefined,
	names: Iterable<string>
): Set<Declared> => {
	const reached = new Set<Declared>()
	const reach = (declared: Declared | undefined) => {
		if (!declared || reached.has(declared)) return
		reached.add(declared)
		for (const read of readsOf(declared)) reach(read)
	}
	for (const name of names) reach(exportedBy(file, name))
	return reached
}

// a top-level declaration of one of the runtime's modules
interface Declared {
	binding: Binding
	module: SourceModule
	length: number
	reads?: Declared[]
}

const modulesByFile: Record<string, SourceModule> = {}
const declaredByBinding = new Map<Binding, Declared>()

const moduleAt = (file: string): SourceModule => {
	if (modulesByFile[file]) return modulesByFile[file]
	const module = (modulesByFile[file] = new SourceModule(
		file,
		readFileSync(file, "utf8"),
		file
	))
	const { bindings } = module.scopes.root
	for (const name in bindings) {
		const binding = bindings[name]
		declaredByBinding.set(binding, {
			binding,
			module,
			length: minifiedLengthOf(javaScriptOf(module, binding.declaration))
		})
	}
	return module
}

const fileOf = (specifier: string, importer: string): string | undefined => {
	try {
		return createRequire(importer).resolve(specifier)
	} catch {
		// e.g. a package without a require condition, whose code isn't counted
		return
	}
}

// the declaration of a module's export, through imports and re-exports
const exportedBy = (
	file: string | undefined,
	name: string
): Declared | undefined => {
	if (!file) return
	const { scopes } = moduleAt(file)
	const entry = scopes.exportsByName[name]
	if (entry?.kind === "binding") return declaredAs(entry.binding)
	if (entry?.kind === "reexport")
		return exportedBy(fileOf(entry.specifier, file), entry.name)
	if (entry) return
	for (const specifier of scopes.starExports) {
		const declared = exportedBy(fileOf(specifier, file), name)
		if (declared) return declared
	}
}

const declaredAs = (binding: Binding): Declared | undefined => {
	const declared = declaredByBinding.get(binding)
	if (!declared || binding.kind !== "import") return declared
	const specifier = binding.declaration
	// a namespace import's module isn't counted
	if (
		specifier.type !== "ImportSpecifier" ||
		specifier.parent?.type !== "ImportDeclaration"
	)
		return
	return exportedBy(
		fileOf(specifier.parent.source.value, declared.module.id),
		specifier.imported.type === "Identifier" ?
			specifier.imported.name
		:	specifier.imported.value
	)
}

// the top-level declarations a declaration reads
const readsOf = (declared: Declared): Declared[] => {
	if (declared.reads) return declared.reads
	const { binding, module } = declared
	const { start, end } = binding.declaration
	const reads: Declared[] = (declared.reads = [])
	for (const reference of module.scopes.references) {
		const read = reference.binding
		if (
			read &&
			read !== binding &&
			read.scope === module.scopes.root &&
			reference.id.start >= start &&
			reference.id.end <= end
		) {
			const readDeclared = declaredAs(read)
			if (readDeclared) reads.push(readDeclared)
		}
	}
	return reads
}

// a declaration's code without its types, as a runtime read from source (as
// in this repo) is minified once they're stripped
const javaScriptOf = (module: SourceModule, declaration: Node): string => {
	const code = module.textOf(declaration)
	if (!/\.[cm]?tsx?$/.test(module.id)) return code
	const chars = code.split("")
	const blank = ({ start, end }: Node) => {
		for (let i = start; i < end; i++) chars[i - declaration.start] = " "
	}
	const visit = (node: Node) => {
		if (
			(node.type === "PropertyDefinition" && node.declare) ||
			node.type === "TSIndexSignature" ||
			node.type === "TSDeclareFunction" ||
			node.type.startsWith("TSAbstract")
		)
			return blank(node)
		for (const k of visitorKeys[node.type] ?? []) {
			const child = (node as never)[k] as Node | (Node | null)[] | null
			for (const item of Array.isArray(child) ? child : [child]) {
				if (!item) continue
				if (k in typeKeys) blank(item)
				else visit(item)
			}
		}
	}
	visit(declaration)
	return chars.join("")
}
