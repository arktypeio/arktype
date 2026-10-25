import { declaredNameOf, holeNameOf } from "@ark/aot/internal/holeNames.ts"
import { combinesChecks } from "@ark/aot/internal/smaller.ts"
import { arkKindOf, printable } from "@ark/util"
import {
	keyOf,
	precompileStandalone,
	type FactoryParam,
	type Foldable,
	type Optimization,
	type StandaloneExport,
	type StandaloneOptions
} from "arktype/internal/standalone.ts"
import prettierPluginTypeScript from "prettier/plugins/typescript"
import { evaluate, isolate } from "./execute.ts"

/** what @ark/aot writes for a program's Types, as `inline: true` writes it */
export interface Precompiled {
	/** a size build's checkers, then the same validators compiled if they can be */
	written: string[]
	/** each Type it leaves dynamic, with why */
	refusals: Record<string, string>
}

interface EstreeNode {
	type: string
	range: [start: number, end: number]
	[k: string]: unknown
}

interface FunctionSite {
	node: EstreeNode
	parent: EstreeNode | undefined
}

// the editor's file, as a build of it would name it
const path = "/main.ts"

const functionTypes = new Set([
	"ArrowFunctionExpression",
	"FunctionExpression",
	"FunctionDeclaration",
	"ClassExpression",
	"ClassDeclaration"
])

const exportedKinds = new Set<unknown>(["root", "module", "scope", "generic"])

const isNode = (value: unknown): value is EstreeNode =>
	typeof (value as EstreeNode | null)?.type === "string"

const childrenOf = (node: EstreeNode): EstreeNode[] =>
	Object.entries(node).flatMap(([k, v]) =>
		k === "range" || k === "loc" ? []
		: Array.isArray(v) ? v.filter(isNode)
		: isNode(v) ? [v]
		: []
	)

const nameOfId = (id: unknown) =>
	isNode(id) && id.type === "Identifier" ? (id.name as string) : undefined

const parse = async (code: string): Promise<EstreeNode> =>
	(await prettierPluginTypeScript.parsers!.typescript.parse(
		code,
		{} as never
	)) as EstreeNode

// those the interpreter names, in source order
const functionsOf = (program: EstreeNode): FunctionSite[] => {
	const functions: FunctionSite[] = []
	const visit = (node: EstreeNode, parent: EstreeNode | undefined) => {
		const isMethod =
			parent?.type === "MethodDefinition" ||
			(parent?.type === "Property" && (parent.method || parent.kind !== "init"))
		if (functionTypes.has(node.type) && !isMethod)
			functions.push({ node, parent })
		for (const child of childrenOf(node)) visit(child, node)
	}
	visit(program, undefined)
	return functions
}

const holeNameAt = ({ node, parent }: FunctionSite) =>
	holeNameOf(
		declaredNameOf(node as never, parent as never),
		path,
		node.range[0]
	)

// names each emitted function as the build's interpreter names its source, so
// the writer can tell the functions a Type holds from arktype's own
const nameFunctions = (
	code: string,
	program: EstreeNode,
	emitted: FunctionSite[],
	written: FunctionSite[]
): string => {
	const inserts: [at: number, rank: number, text: string][] = []
	const prologue: string[] = []
	for (const [i, { node, parent }] of emitted.entries()) {
		const [start, end] = node.range
		const name = JSON.stringify(holeNameAt(written[i]))
		const rename = `$arkHole(${nameOfId(node.id)}, ${name});`
		// a declaration is hoisted, so may be read before it's reached
		if (node.type === "FunctionDeclaration" && parent === program)
			prologue.push(rename)
		else if (node.type.endsWith("Declaration"))
			inserts.push([end, -start, `\n${rename}`])
		else inserts.push([start, -end, "$arkHole("], [end, -start, `, ${name})`])
	}
	inserts.sort((l, r) => l[0] - r[0] || l[1] - r[1])
	let named = ""
	let last = 0
	for (const [at, , text] of inserts) {
		named += code.slice(last, at) + text
		last = at
	}
	return `function $arkHole(f, name) {
	return Object.defineProperty(f, "name", { value: name })
}
${prologue.join("\n")}
${named}${code.slice(last)}`
}

// the names a program declares at its top level, with each one's initializer
const declarationsOf = (program: EstreeNode) => {
	const initsByName: Record<string, EstreeNode | undefined> = {}
	for (const statement of program.body as EstreeNode[]) {
		if (statement.type === "VariableDeclaration") {
			for (const declarator of statement.declarations as EstreeNode[]) {
				const name = nameOfId(declarator.id)
				if (name) initsByName[name] = declarator.init as EstreeNode
			}
		} else if (
			statement.type === "FunctionDeclaration" ||
			statement.type === "ClassDeclaration"
		) {
			const name = nameOfId(statement.id)
			if (name) initsByName[name] = undefined
		}
	}
	return initsByName
}

// the identifiers a definition reads as it's evaluated, outside its functions
const readsOf = (init: EstreeNode): EstreeNode[] => {
	const reads: EstreeNode[] = []
	const visit = (node: EstreeNode, parent: EstreeNode | undefined) => {
		if (functionTypes.has(node.type)) return
		if (
			node.type === "Identifier" &&
			!(
				(parent?.type === "MemberExpression" &&
					parent.property === node &&
					!parent.computed) ||
				(parent?.type === "Property" && parent.key === node && !parent.computed)
			)
		)
			reads.push(node)
		for (const child of childrenOf(node)) visit(child, node)
	}
	visit(init, undefined)
	return reads
}

const contains = (outer: EstreeNode, inner: EstreeNode) =>
	outer.range[0] <= inner.range[0] && inner.range[1] <= outer.range[1]

// a function the definition passes as it is, not one read off another value
// or returned by another function
const isPassedIn = (init: EstreeNode, node: EstreeNode): boolean => {
	let current = init
	while (current !== node) {
		const next = childrenOf(current).find(child => contains(child, node))
		if (
			!next ||
			functionTypes.has(current.type) ||
			// a method chain reads off what a call returns
			(current.type === "MemberExpression" &&
				current.object === next &&
				next.type !== "CallExpression")
		)
			return false
		current = next
	}
	return true
}

// as @ark/aot labels a value a factory receives
const labelOf = (source: string, { range: [start, end] }: EstreeNode) => {
	const lines = source.slice(0, start).split("\n")
	return `\`${source.slice(start, end)}\` (${path}:${lines.length}:${lines.at(-1)!.length + 1})`
}

// what a definition reads that @ark/aot would pass to its validator
const refusalOf = (
	init: EstreeNode,
	values: Record<string, unknown>
): string | undefined => {
	for (const read of readsOf(init)) {
		const name = read.name as string
		if (!(name in values)) continue
		const value = values[name]
		if (exportedKinds.has(arkKindOf(value))) {
			if (keyOf(value as Foldable)[1].length)
				return `it reads ${name}, which holds functions, so a build passes ${name} to its validator, which the playground doesn't write`
		} else if (typeof value === "object" && value !== null)
			return `it reads ${name}, which the program can change, so a build checks ${name} as its validator is created, which the playground doesn't write`
	}
}

const optionsOf = (
	optimize: Optimization,
	names: string[]
): StandaloneOptions => ({
	members: {},
	freeze: true,
	lazy: true,
	checks: "types",
	optimize,
	called: true,
	readsAllows: true,
	piped: true,
	hoisted: false,
	values: true,
	readOnLoad: names
})

/**
 * Writes a program's validators as @ark/aot writes them for a module no
 * bundler scanned, refusing those it would write from what the program reads
 */
export const writePrecompiled = async (
	source: string,
	js: string,
	optimize: Optimization
): Promise<Precompiled> => {
	const isolated = isolate(js)
	const program = await parse(isolated)
	const sourceProgram = await parse(source)
	const emitted = functionsOf(program)
	const written = functionsOf(sourceProgram)
	// the emit strips only types, so keeps every function in order, unless
	// e.g. an enum adds its own
	const isMapped = emitted.length === written.length
	const initsByName = declarationsOf(program)
	const sourceInitsByName = declarationsOf(sourceProgram)
	const values = evaluate(
		nameFunctions(isolated, program, emitted, isMapped ? written : emitted),
		Object.keys(initsByName)
	)
	const holesByName = new Map(
		(isMapped ? written : []).map(site => [holeNameAt(site), site])
	)
	const refusals: Record<string, string> = {}
	const exportsByName: Record<string, StandaloneExport> = {}
	let tables = 0
	for (const [name, value] of Object.entries(values)) {
		const init = initsByName[name]
		const sourceInit = sourceInitsByName[name]
		// a value read off a site, as `types.user` is, isn't one
		if (
			!exportedKinds.has(arkKindOf(value)) ||
			init?.type !== "CallExpression" ||
			!sourceInit
		)
			continue
		const refusal = refusalOf(init, values)
		if (refusal) {
			refusals[name] = refusal
			continue
		}
		// received in the order the definition reads them
		const received: [start: number, param: FactoryParam][] = []
		for (const hole of keyOf(value as Foldable)[1]) {
			const site =
				typeof hole === "function" ? holesByName.get(hole.name) : undefined
			const declared =
				site && declaredNameOf(site.node as never, site.parent as never)
			const read =
				!site ? undefined
				: contains(sourceInit, site.node) ?
					isPassedIn(sourceInit, site.node) ? site.node
					:	undefined
				:	declared && readsOf(sourceInit).find(read => read.name === declared)
			if (!read) {
				refusals[name] =
					`${name} holds ${printable(hole)}, which the playground can't trace to where ${name} reads it`
				break
			}
			received.push([
				read.range[0],
				{
					kind: site!.node.type.startsWith("Class") ? "class" : "function",
					label: labelOf(source, read),
					value: hole,
					// the editor's module is the only one, so created all it holds
					isOwn: true
				}
			])
		}
		if (refusals[name]) continue
		exportsByName[name] =
			received.length ?
				{
					type: value as never,
					params: received
						.sort((l, r) => l[0] - r[0])
						.map(([, param]) => param),
					internedBy: tables++
				}
			:	(value as StandaloneExport)
	}
	let names = Object.keys(exportsByName)
	// a build writes the others beside it, which changes how they're written
	if (!names.length || Object.keys(refusals).length)
		return { written: [], refusals }
	const write = (names: string[], combines = true) =>
		precompileStandalone(
			Object.fromEntries(names.map(name => [name, exportsByName[name]])),
			{ ...optionsOf(optimize, names), combines }
		).code
	let checkers: string
	try {
		checkers = write(names)
	} catch {
		// one bad export refuses a whole artifact, so retry each alone
		names = names.filter(name => {
			try {
				write([name])
				return true
			} catch (e) {
				refusals[name] = e instanceof Error ? e.message : String(e)
				return false
			}
		})
		if (!names.length) return { written: [], refusals }
		checkers = write(names)
	}
	const writtenCode = [checkers]
	if (combinesChecks(optionsOf(optimize, names))) {
		try {
			writtenCode.push(write(names, false))
		} catch {
			// left as checkers, as a build leaves them
		}
	}
	return { written: writtenCode, refusals }
}
