import { hasArkKind, type BaseRoot } from "@ark/schema"
import {
	hasDomain,
	hashOf,
	isThunk,
	registeredNameOf,
	type ParseError
} from "@ark/util"
import {
	isTypedFn,
	type DefaultCheck,
	type Foldable,
	type ScopeAlias,
	type StandaloneIntrospection
} from "arktype/internal/standalone.ts"
import type { Node, Span } from "oxc-parser"
import { isPlainContainer } from "./builtins.ts"
import { chainOf, DynamicValue } from "./dynamic.ts"
import {
	contains,
	enclosingFunctionOf,
	errorReaders,
	isArk,
	staticBodyOf,
	isRuntimeExport,
	isIntrospectedProperty,
	isValidatorMember,
	memberNameOf,
	type ArkExportName,
	type FunctionNode,
	type ModuleGraph,
	type StandInKind
} from "./graph.ts"
import {
	createSiteState,
	findDynamic,
	isDynamic,
	type Interpreter,
	type SiteState
} from "./interpreter.ts"
import type { SourceModule } from "./module.ts"
import {
	operatorOf,
	type Binding,
	type Reference as BindingReference
} from "./scope.ts"

export interface SiteCandidate {
	kind: SiteKind
	root: Node
	// the nearest enclosing function, which runs the site each time it is called
	fn: FunctionNode | undefined
	state: SiteState
	// the callees or arguments the site can shrink back to, innermost first
	fallbacks: Node[]
	// what it reads a validator member of, innermost first, ending at a Type
	ends: Node[]
	// the function a call to a static helper calls, e.g. `text` for `text(50)`
	callee?: [FunctionNode, SourceModule]
	isSite?: boolean
}

export interface SiteRead {
	reference: BindingReference
	kind: SiteKind
	root: Node
	candidate: SiteCandidate | undefined
}

export const findSites = (
	module: SourceModule,
	graph: ModuleGraph,
	// fold json and toJSON() at their own site, as standalone bakes them
	foldsIntrospection: boolean
): SiteRead[] => {
	const reads: SiteRead[] = []
	// candidates climbing to one node evaluate it once
	const statesByNode = new Map<Node, SiteState>()
	for (const reference of module.scopes.references) {
		const found = rootOf(reference, module, graph)
		if (!found) continue
		const [kind, root, callee] = found
		const fallbacks: Node[] = callee ? [root] : []
		const ends: Node[] = []
		const climbed = climb(
			callee ? operatorOf(root)[1]! : root,
			fallbacks,
			ends,
			module,
			graph
		)
		const top =
			(foldsIntrospection && introspectionReadOf(climbed, module, graph)) ||
			climbed
		let candidate: SiteCandidate | undefined
		if (top !== root) {
			let state = statesByNode.get(top)
			if (!state) statesByNode.set(top, (state = createSiteState(top, module)))
			candidate = {
				kind,
				root,
				fn: enclosingFunctionOf(reference.id),
				state,
				fallbacks,
				ends
			}
			if (callee) candidate.callee = callee
		}
		reads.push({ reference, kind, root, candidate })
	}
	return reads
}

// sites are judged once every reference is read
export const filterSites = (
	reads: SiteRead[],
	module: SourceModule,
	interpreter: Interpreter
): SiteCandidate[] => {
	const candidates: SiteCandidate[] = []
	for (const { reference, kind, root, candidate } of reads) {
		const value =
			kind !== "reference" ? undefined
			: root === reference.id ?
				interpreter.valueOfBinding(reference.binding!, module)
			:	interpreter.evaluateSite(createSiteState(root, module)).value
		// reported where it's defined, or data or a RegExp read at runtime
		if (
			kind === "reference" &&
			(value === undefined || isDynamic(value) || value instanceof RegExp)
		)
			continue
		if (candidate) candidates.push(candidate)
	}
	return candidates.sort(
		(l, r) =>
			depthOf(l.fn) - depthOf(r.fn) ||
			l.state.node.start - r.state.node.start ||
			r.state.node.end - l.state.node.end
	)
}

const rootOf = (
	reference: BindingReference,
	module: SourceModule,
	graph: ModuleGraph
):
	| [kind: SiteKind, root: Node, callee?: [FunctionNode, SourceModule]]
	| undefined => {
	const binding = reference.binding
	if (!binding || reference.isWrite) return
	const [name, read] = graph.arkExportOf(reference, module) ?? []
	if (name) {
		return isRuntimeExport(name) || name in errorReaders ?
				undefined
			:	[name, read!]
	}
	if (isArk(graph.bindingKindOf(binding, module)))
		return ["reference", reference.id]
	const member = arkMemberOf(reference.id, module, graph)
	if (member) return ["reference", member]
	const [operand, parent] = operatorOf(reference.id)
	const callee =
		parent?.type === "MemberExpression" && parent.object === operand ?
			parent
		:	reference.id
	const fn = graph.functionOf(callee, module)
	if (!fn || !staticBodyOf(fn[0])) return
	const [calleeOperand, call] = operatorOf(callee)
	if (
		graph.composerOf(callee, module) ||
		// e.g. `nullable(User)`, whose kind is what it returns for `User`
		(call?.type === "CallExpression" &&
			call.callee === calleeOperand &&
			isArk(graph.kindOf(call, module)))
	)
		return ["reference", callee, fn]
}

const arkMemberOf = (
	node: Node,
	module: SourceModule,
	graph: ModuleGraph
): Node | undefined => {
	for (;;) {
		const [operand, member] = operatorOf(node)
		if (member?.type !== "MemberExpression" || member.object !== operand) return
		if (isArk(graph.kindOf(member, module))) return member
		node = member
	}
}

// e.g. `T.json`, `T.expression`, `T.toJsonSchema()` or `$.json`
const introspectionReadOf = (
	node: Node,
	module: SourceModule,
	graph: ModuleGraph
): Node | undefined => {
	const [operand, member] = operatorOf(node)
	if (
		member?.type !== "MemberExpression" ||
		member.object !== operand ||
		!isArk(graph.kindOf(node, module))
	)
		return
	const name = memberNameOf(member)
	if (isIntrospectedProperty(name)) return member
	if (name !== "toJSON" && name !== "toJsonSchema") return
	const [callee, call] = operatorOf(member)
	return call?.type === "CallExpression" && call.callee === callee ?
			call
		:	undefined
}

// e.g. `A.and(B).array()` from `A`
const climb = (
	root: Node,
	fallbacks: Node[],
	ends: Node[],
	module: SourceModule,
	graph: ModuleGraph
): Node => {
	let top = root
	for (;;) {
		const composer = graph.composerOf(top, module)
		if (!composer) return top
		if (composer.type !== "MemberExpression") fallbacks.push(top)
		else if (isValidatorMember(memberNameOf(composer))) ends.push(top)
		top = composer
	}
}

const depthOf = (fn: FunctionNode | undefined) => {
	let depth = 0
	for (let node: Node | undefined = fn; node; node = enclosingFunctionOf(node))
		depth++
	return depth
}

// an arktype export, or "reference" for the program's own Type
export type SiteKind = ArkExportName | "reference"

export interface Site {
	kind: SiteKind
	start: number
	end: number
	line: number
	column: number
	status: "accepted" | "rejected" | "island"
	reasons: string[]
	// what a factory reproduces
	value: unknown
	// the Types cache mode precompiles
	roots: BaseRoot[]
	// thrown by its factory at creation
	parseError: ParseError | undefined
	arktypeArguments: unknown[]
	holes: Hole[]
	// functions arktype calls while defining it, e.g. a literal's narrow
	called: Hole[]
	inputs: Input[]
	helpers: Helper[]
	references: Reference[]
	// the argument of a `define` call, evaluated in its place
	definition: Node | undefined
	// defaults its factory checks at creation
	defaultChecks: DefaultCheck[]
	// Scope aliases resolved while defining it
	aliases: ScopeAlias[]
	// the statement count and binding its module must have run
	progress: [at: number, name: string] | undefined
	// start of its declaring statement, which a bundler may drop
	declarationStart: number | undefined
	// whether it initializes a variable, e.g. one a function declares
	initializes: boolean
	// e.g. `User` and "json" for `User.json`
	introspection:
		| Pick<StandaloneIntrospection, "member" | "type" | "thrown">
		| undefined
	// e.g. `User.extends` in `User.extends(T.in)`
	unavailableRead: string | undefined
}

export interface Hole {
	file: string
	// the expression evaluated in place at runtime
	start: number
	end: number
	value: unknown
	kind: "function" | "class" | "symbol" | "opaque"
	isCalledAtDefinition: boolean
}

export interface Reference {
	start: number
	end: number
	value: unknown
	// the unwritten binding a site initialized that it reads
	fixedBy: Binding | undefined
	// a function or symbol its own module creates
	isOwnHole: boolean
	// imported from a module that only declares and has run
	isInert: boolean
	// created by a call to arktype the site makes, which its factory replaces
	isCreated: boolean
}

export interface Input {
	kind: "import" | "local"
	// for an import, the module that exports it
	file: string | undefined
	name: string
	path: PropertyKey[]
	value: unknown
}

export interface Helper {
	file: string
	name: string
	start: number
	end: number
}

// a cyclic Type's hash holds registry counters, so name by position
export const siteNameOf = (site: Site): string =>
	hashOf(
		site.parseError ?
			[site.parseError.message, ...(site.progress ?? [])].join("\n")
		:	`${site.start}`
	)

export const rangeOf = (span: Span): string => `${span.start}:${span.end}`

export const rangesOf = (sites: Site[]): Map<string, Site> =>
	new Map(sites.map(site => [rangeOf(site), site]))

// AST nodes nest, so an ancestor's range suffices
export const isWithin = (node: Node, ranges: Set<string>): boolean => {
	for (let n: Node | null | undefined = node; n; n = n.parent)
		if (ranges.has(rangeOf(n))) return true
	return false
}

export const isFoldable = (value: unknown): value is Foldable =>
	hasArkKind(value, "root") ||
	hasArkKind(value, "module") ||
	hasArkKind(value, "scope") ||
	hasArkKind(value, "generic") ||
	isTypedFn(value)

// the Type, for a site reading its introspection
export const createdBy = (site: Site): Foldable | undefined =>
	isFoldable(site.value) ? site.value : site.introspection?.type

export const exportedRootsOf = (value: unknown): BaseRoot[] => {
	let module = value
	if (hasArkKind(value, "scope")) {
		try {
			module = value.export()
		} catch {
			// a scope whose export throws defines no Type
			return []
		}
	}
	return hasArkKind(module, "module") ? rootsIn(module) : []
}

export const rootsIn = (value: unknown): BaseRoot[] =>
	[...arkObjectsIn(value)].filter(member => hasArkKind(member, "root"))

// e.g. a Module and each Type it holds
export const arkObjectsIn = (
	value: unknown,
	result = new Set<unknown>()
): Set<unknown> => {
	if (!isFoldable(value) || result.has(value)) return result
	result.add(value)
	if (hasArkKind(value, "module"))
		for (const member of Object.values(value)) arkObjectsIn(member, result)
	if (isTypedFn(value)) {
		arkObjectsIn(value.params, result)
		arkObjectsIn(value.returns, result)
	}
	return result
}

export const standInKindOf = (value: unknown): StandInKind | undefined =>
	hasArkKind(value, "scope") ? "Scope"
	: hasArkKind(value, "generic") ? "Generic"
	: undefined

// e.g. `{ s: $ }`
export const heldStandInOf = (
	value: unknown,
	seen = new Set<unknown>()
): StandInKind | undefined => {
	if (!isPlainContainer(value) || seen.has(value)) return
	seen.add(value)
	for (const key of Reflect.ownKeys(value)) {
		const held = Reflect.get(value, key)
		const kind = standInKindOf(held) ?? heldStandInOf(held, seen)
		if (kind) return kind
	}
}

export const thunksIn = (
	value: unknown,
	thunks: unknown[] = [],
	seen = new Set<unknown>()
): unknown[] => {
	if (isThunk(value)) thunks.push(value)
	else if (isPlainContainer(value) && !seen.has(value)) {
		seen.add(value)
		for (const v of Object.values(value)) thunksIn(v, thunks, seen)
	}
	return thunks
}

export const holdsValidate = (
	value: unknown,
	fn: unknown,
	seen = new Set<unknown>()
): boolean => {
	if (!isPlainContainer(value) || seen.has(value)) return false
	seen.add(value)
	const standard = Reflect.get(value, "~standard")
	return (
		(isPlainContainer(standard) && Reflect.get(standard, "validate") === fn) ||
		Object.values(value).some(v => holdsValidate(v, fn, seen))
	)
}

export const refuse = (site: Site, reasons: string[]): Site => {
	site.status = "rejected"
	site.reasons = reasons
	site.value = undefined
	site.roots = []
	site.holes = []
	site.called = []
	site.inputs = []
	site.references = []
	return site
}

export const refuseDynamic = (site: Site, dynamic: DynamicValue): Site =>
	refuse(site, chainOf(dynamic))

export const rejectionOf = (state: SiteState): DynamicValue | undefined =>
	state.error instanceof DynamicValue ? state.error
	: state.error === undefined ? findDynamic(state.value)
	: undefined

export const textOfInput = (input: Input): string =>
	[input.name, ...input.path.map(String)].join(".")

export const isCoveredBy = (input: Input, existing: Input): boolean =>
	input.kind === existing.kind &&
	input.file === existing.file &&
	input.name === existing.name &&
	existing.path.length <= input.path.length &&
	existing.path.every((k, i) => input.path[i] === k)

// e.g. "default" for `T.default("free")`, a key's definition a validator lacks
export const keyedMethodOf = (site: Site): string | undefined =>
	Array.isArray(site.value) ?
		/\.(default|optional)$/.exec(site.unavailableRead ?? "")?.[1]
	:	undefined

export const methodMembers = ["traverse", "from", "toString"] as const

// a site in a function an enclosing site calls at build is folded
export const isFolded = (
	candidate: SiteCandidate,
	candidates: SiteCandidate[],
	interpreter: Interpreter
): boolean =>
	!!candidate.fn &&
	candidates.some(
		outer =>
			outer !== candidate &&
			outer.state.interpreted.has(candidate.fn!) &&
			contains(outer.state.node, candidate.fn!) &&
			!outer.state.holes.some(
				hole =>
					hasDomain(hole, "object") &&
					interpreter.standIns.get(hole)?.node === candidate.fn &&
					isHeld(hole, interpreter)
			)
	)

// a function arktype only calls while defining a type isn't part of it
export const isHeld = (hole: unknown, interpreter: Interpreter): boolean =>
	!hasDomain(hole, "object") ||
	!interpreter.standIns.get(hole)!.isCalled ||
	registeredNameOf(hole) !== undefined
