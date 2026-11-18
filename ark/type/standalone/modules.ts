import type { StandaloneOptions } from "./baking.ts"

export const runtimeImport = `import * as runtime from "arktype/runtime"`

export interface SharedModule {
	readsRuntime: boolean
	imports: Record<string, string[]>
	declarations: string[]
	exports: string[]
	scope?: UnitScope | undefined
}

// a unit's function, which units reading it alone can share
export interface UnitScope {
	name: string
	// each array of traversals it reads, by the names read at its indices
	dependencies: Record<string, string[]>
	params: string[]
	args: string[]
	statements: string[]
	returned: string[]
	// each root's node, written from the scope's names
	nodes: Record<string, string>
	// else its names could clash with another's
	declaresOnlyRefs: boolean
}

// "" reads for the artifact's own code
const readersIn = (
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>
): Record<string, string[]> => {
	const readers: Record<string, string[]> = {}
	for (const specifier in imports) (readers[specifier] ??= []).push("")
	for (const reader in shared) {
		for (const specifier in shared[reader].imports)
			(readers[specifier] ??= []).push(reader)
	}
	return readers
}

// a unit all of whose readers share one scope is written into it
export const mergeUnits = (
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>,
	opts: StandaloneOptions
): void => {
	const readers = readersIn(shared, imports)
	const roots: Record<string, string> = {}
	const rootOf = (specifier: string): string => {
		if (specifier in roots) return roots[specifier]
		roots[specifier] = specifier
		if (!shared[specifier].scope?.declaresOnlyRefs || !readers[specifier])
			return specifier
		let root: string | undefined
		for (const reader of readers[specifier]) {
			const readerRoot = shared[reader]?.scope && rootOf(reader)
			if (!readerRoot || (root && root !== readerRoot)) return specifier
			root = readerRoot
		}
		return (roots[specifier] = root!)
	}
	const groups: Record<string, Set<string>> = {}
	for (const specifier in readers) {
		if (!shared[specifier]) continue
		const root = rootOf(specifier)
		if (root !== specifier) (groups[root] ??= new Set([root])).add(specifier)
	}
	for (const root in groups) {
		const written = writeMerged(shared, root, groups[root], opts)
		if (!written) continue
		const { scope, ...module } = shared[root]
		shared[root] = {
			...module,
			imports: written.imports,
			declarations: [written.declaration, ...module.declarations.slice(1)]
		}
		for (const specifier of groups[root])
			if (specifier !== root) delete shared[specifier]
	}
}

export const writeModule = ({
	readsRuntime,
	imports,
	declarations,
	exports
}: SharedModule): string =>
	writeSections([
		[readsRuntime ? runtimeImport : "", writeImports(imports)]
			.filter(statement => statement)
			.join("\n"),
		...declarations,
		`export { ${exports.join(", ")} }`
	])

const writeMerged = (
	shared: Record<string, SharedModule>,
	root: string,
	group: ReadonlySet<string>,
	opts: StandaloneOptions
): { declaration: string; imports: Record<string, string[]> } | undefined => {
	// read units first, as a forwarded traversal is read as it's declared
	const ordered: string[] = []
	const visit = (specifier: string) => {
		if (!group.has(specifier) || ordered.includes(specifier)) return
		for (const read in shared[specifier].imports) visit(read)
		ordered.push(specifier)
	}
	visit(root)
	const scopes = ordered.map(specifier => shared[specifier].scope!)
	const names = new Set(scopes.map(scope => scope.name))
	const dependencies: Record<string, string[]> = {}
	const args = new Map<string, string>()
	const nodesRead = new Set<string>()
	for (const scope of scopes) {
		for (const source in scope.dependencies) {
			if (names.has(source)) continue
			const read = (dependencies[source] ??= [])
			for (const [i, name] of Object.entries(scope.dependencies[source]))
				read[+i] = name
		}
		for (const [i, param] of scope.params.entries()) {
			const arg = scope.args[i]
			if (arg === `${param}Node` && scopes.some(({ nodes }) => param in nodes))
				nodesRead.add(param)
			else if ((args.get(param) ?? arg) !== arg) return
			else args.set(param, arg)
		}
	}
	const statements: string[] = []
	const declared = new Set<string>()
	for (const scope of scopes) {
		for (const statement of scope.statements) {
			const name = /^const ([\w$]+) =/.exec(statement)?.[1]
			// a node two units reach is declared by each
			if (name !== undefined && declared.has(name)) continue
			if (name !== undefined) declared.add(name)
			statements.push(statement)
		}
		for (const name in scope.nodes) {
			if (nodesRead.has(name))
				statements.push(`const ${name} = ${scope.nodes[name]}`)
		}
	}
	const rootScope = shared[root].scope!
	// a merged unit's exports are gone, though a node it shares is declared
	const removed = new Set(
		scopes
			.flatMap(scope =>
				scope === rootScope ?
					[]
				:	[scope.name, ...Object.keys(scope.nodes).map(name => `${name}Node`)]
			)
			.filter(name => !nodesRead.has(name))
	)
	// a unit's names are words, read where a word is one
	if (
		[...statements, ...args.values()].some(text =>
			text.match(/\w+/g)?.some(word => removed.has(word))
		)
	)
		return
	const shortest = opts.optimize === "size"
	const [dependencyParams, dependencyArgs] = writeDependencies(
		dependencies,
		shortest
	)
	const params = [...dependencyParams, ...args.keys()]
	const imports: Record<string, string[]> = {}
	for (const specifier of ordered) {
		for (const read in shared[specifier].imports) {
			if (group.has(read)) continue
			const into = (imports[read] ??= [])
			for (const name of shared[specifier].imports[read])
				if (!into.includes(name)) into.push(name)
		}
	}
	return {
		declaration: `const ${rootScope.name} = ${noInlineOf(shortest)}/* @__PURE__ */ (${writeScope(
			params.length || shortest ? params : ["...$"],
			statements,
			rootScope.returned
		)})(${[...dependencyArgs, ...args.values()].join(", ")})`,
		imports
	}
}

export const writeDependencies = (
	namesBySource: Record<string, string[]>,
	shortest: boolean
): [params: string[], args: string[]] => {
	const params: string[] = []
	const args: string[] = []
	for (const source in namesBySource) {
		const names = namesBySource[source]
		params.push(
			shortest ?
				`[${names.join(", ")}]`
			:	`{ ${Object.entries(names)
					.map(([index, name]) => `${index}: ${name}`)
					.join(", ")} }`
		)
		args.push(source)
	}
	return [params, args]
}

// swc would inline a speed build's traversals as variables V8 can't; first, as
// terser reads only the nearest annotation
export const noInlineOf = (shortest: boolean): string =>
	shortest ? "" : "/* @__NOINLINE__ */ "

export const writeScope = (
	params: string[],
	statements: string[],
	returned: string[]
): string => `(${params.join(", ")}) => {
${statements.join("\n")}
return [${returned.join(", ")}]
}`

export const writeSections = (sections: string[]): string =>
	`${sections.filter(section => section).join("\n\n")}\n`

export const writeImports = (imports: Record<string, string[]>): string =>
	Object.entries(imports)
		.map(
			([specifier, names]) =>
				`import { ${names.join(", ")} } from ${JSON.stringify(specifier)}`
		)
		.join("\n")
