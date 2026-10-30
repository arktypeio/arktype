import {
	arityOf,
	hashOf,
	hasDomain,
	hasOwn,
	includes,
	isArray,
	isIpv4,
	isIpv6,
	isIso8601,
	isNumericString,
	isUuid,
	isValidDate,
	isWellFormedInteger,
	jsTypeOfDescriptions,
	nameOf,
	printable,
	serializePrimitive,
	throwInternalError,
	timeOf,
	type Dict,
	type Fn
} from "@ark/util"
import { referencesThroughAliases, type BaseNode } from "./node.ts"
import type { NodeId } from "./parse.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { BaseScope } from "./scope.ts"
import {
	CompiledFunction,
	isRefinedBasis,
	NodeCompiler,
	type InvokeOptions,
	type ReferenceOptions
} from "./shared/compile.ts"
import { errorFromUnion } from "./shared/errors.ts"
import { ArkErrors } from "./shared/issues.ts"
import type { NodeKind } from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import {
	copyOf,
	holdsOnlyIndices,
	keepOwn,
	mergeTransformed,
	TransformErrors
} from "./shared/transform.ts"
import {
	addErrors,
	addMorphErrs,
	allowsInBranch,
	allowsInBranchBy,
	callMorph,
	disallowed,
	matchesRepeated,
	pipeApplied,
	pipeChecked,
	pipeTransformed,
	rejected,
	rejects,
	transformed,
	transformedInApply,
	transformsValid,
	type TraversalKind,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "./shared/traversal.ts"
import { hasArkKind, isNode } from "./shared/utils.ts"
import { arrayIndexMatcher } from "./structure/shared.ts"

// leaves read no object property
const isLeafIn = (node: BaseNode, byId: Record<string, BaseNode>): boolean => {
	if (!node.isRoot()) return false
	for (const id in node.byId) {
		const reference = node.byId[id]
		if (
			reference !== byId[id] ||
			reference.is("structure") ||
			reference.is("alias")
		)
			return false
	}
	return true
}

export const precompile = (
	references: readonly BaseNode[],
	owningScope?: BaseScope,
	unbound?: UnboundTraversals,
	root?: BaseNode
): Fn => {
	const link = createLinkage()
	const reused = new Set<BaseNode>()
	link.reused = reused
	for (const node of references) link.byId[node.id] = node
	const declared: BaseNode[] = []
	const pruned = new Set<BaseNode>()
	for (const node of references) {
		if (node.c.isReusableLeaf && isLeafIn(node, link.byId)) reused.add(node)
		else if (root && node !== root && !node.unitFn) {
			link.unreached.add(node)
			pruned.add(node)
		} else if (
			node.unitFn &&
			(!owningScope || node.$ !== owningScope) &&
			// compiling an alias can create nodes, so every unit declares its own
			!node.is("alias")
		)
			link.unreached.add(node)
		else declared.push(node)
	}
	const unitFn = precompileReferences(declared, link).compile()
	const traversals = unitFn(
		Object.values(link.dependencies).map(([node, kind]) => {
			const traverse: Fn = node[`t${kind}`]!
			// an uncompiled node's traversal is its method, which reads the node
			return hasOwn(node, `t${kind}`) ? traverse : traverse.bind(node)
		}),
		[...link.refs.keys()]
	)
	const bound = [...declared]
	const boundTraversals = traversals.slice(0, declared.length)
	for (let i = 0; i < link.reached.length; i++) {
		if (!pruned.has(link.reached[i])) continue
		bound.push(link.reached[i])
		boundTraversals.push(traversals[declared.length + i])
	}
	bindUnit(bound, unitFn, boundTraversals, link.byId, owningScope, unbound)
	return unitFn
}

// a deferred Type's nodes aren't bound to another Type's unit
export const precompileRoot = (
	root: BaseNode,
	references: readonly BaseNode[]
): void => {
	const unbound: UnboundTraversals = new Map()
	for (const reference of references) {
		if (reference === root || !reference.c.preJit) continue
		for (const id in reference.byId) unbound.set(reference.byId[id], undefined)
	}
	// an apply checking data uncompiled to write in place reads no copy
	for (const node of $ark.inPlace?.checking ?? []) unbound.set(node, undefined)
	unbound.delete(root)
	precompile(references, undefined, unbound, root)
	// what an apply writing in place reads rather than compiling again
	if ($ark.inPlace) root.c.unbound = unbound
}

export const precompileInPlace = (
	root: BaseRoot,
	unbound: UnboundTraversals | undefined
): void => {
	const declared: [node: BaseNode, kinds: TraversalKind[]][] = []
	const kindsByNode = new Map<BaseNode, TraversalKind[]>()
	// a node a morph pipes to, whose traversals pipe reads from it
	const shapes = new Map<
		BaseNode,
		{
			tApply?: TraverseApply | undefined
			tTransform?: TraverseTransform | undefined
		}
	>()
	const include = (node: BaseNode): void => {
		if (link.byId[node.id]) return
		for (const reference of referencesThroughAliases([
			node,
			...node.references
		])) {
			if (link.byId[reference.id]) continue
			link.byId[reference.id] = reference
			const kinds: TraversalKind[] = []
			const isCompiled = !!reference.unitFn || !!unbound?.get(reference)
			if (!isCompiled) kinds.push("Allows")
			if (reference.tfs ? !reference.c.applyInPlace : !isCompiled)
				kinds.push("Apply")
			if (
				reference.tfs &&
				includes(transformedKinds, reference.kind) &&
				!reference.c.applyInPlace
			)
				kinds.push("Transform")
			if (!kinds.length) continue
			declared.push([reference, kinds])
			kindsByNode.set(reference, kinds)
		}
	}
	class InPlaceCompiler extends TraversalCompiler {
		override readonly inPlace = true

		override reach(node: BaseNode): void {
			include(node)
		}

		override refToId(id: NodeId, opts?: ReferenceOptions): string {
			const reference = this.link.byId[id]
			const kind = opts?.kind ?? this.trav
			if (reference && !kindsByNode.get(reference)?.includes(kind))
				this.link.dependencies[`${this.nameOf(id)}${kind}`] = [reference, kind]

			return super.refToId(id, opts)
		}

		override ref(value: object | symbol): string {
			if (!isNode(value) || !value.isRoot() || !value.tfs)
				return super.ref(value)
			include(value)
			let shape = shapes.get(value)
			if (!shape) shapes.set(value, (shape = Object.create(value) as {}))
			return super.ref(shape)
		}
	}
	const link = createLinkage(undefined, { compiler: InPlaceCompiler })
	include(root)
	const names: string[][] = []
	for (let i = 0; i < declared.length; i++) {
		const [node, kinds] = declared[i]
		names.push(kinds.map(kind => declareTraversal(link, node, kind)))
	}
	const unitFn = writeUnit(
		Object.keys(link.dependencies),
		[...link.refs.values()],
		link.members,
		names
	).compile()
	const traversals = unitFn(
		Object.values(link.dependencies).map(
			([node, kind]): Fn =>
				kind === "Allows" || !node.tfs ?
					(unbound?.get(node)?.[kind === "Allows" ? 0 : 1] ?? node[`t${kind}`]!)
				: kind === "Apply" ? node.c.applyInPlace!
				: node.c.transformInPlace!
		),
		[...link.refs.keys()]
	)
	for (let i = 0; i < declared.length; i++) {
		const [node, kinds] = declared[i]
		if (!node.tfs) continue
		// a node another root compiled in place keeps those traversals
		const apply = kinds.indexOf("Apply")
		if (apply !== -1) node.c.applyInPlace = traversals[i][apply] as never
		const transform = kinds.indexOf("Transform")
		if (transform !== -1)
			node.c.transformInPlace = traversals[i][transform] as never
	}
	for (const [node, shape] of shapes) {
		shape.tApply = node.c.applyInPlace
		shape.tTransform = node.c.transformInPlace
	}
}

const bindUnit = (
	declared: readonly BaseNode[],
	unitFn: CompiledUnit,
	compiledTraversals: PrecompiledTraversals[],
	byId: Record<string, BaseNode>,
	owningScope?: BaseScope,
	unbound?: UnboundTraversals
): void => {
	for (let i = 0; i < declared.length; i++) {
		const node = declared[i]
		if (unbound?.has(node)) {
			unbound.set(node, compiledTraversals[i])
			continue
		}
		// if node has already been bound to another scope or anonymous type, don't rebind it
		if (node.unitFn && (!owningScope || node.$ !== owningScope)) continue
		const [tAllows, tApply, tTransform] = compiledTraversals[i]
		if (node.c.preJit) {
			node.allows = node.c.preJit
			node.c.preJit = undefined
		}
		node.tAllows = tAllows
		if (node.isRoot() && !node.allowsCtx) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = tAllows as never
		}
		node.tApply = tApply
		if (tTransform) node.tTransform = tTransform
		node.unitFn = unitFn
		delete node.c.rootApply
		node.c.isReusableLeaf = isLeafIn(node, byId)
	}
}

type PrecompiledTraversals = [
	allows: TraverseAllows,
	apply: TraverseApply,
	transform?: TraverseTransform
]

// traversals a root's unit compiles for another Type's nodes
export type UnboundTraversals = Map<BaseNode, PrecompiledTraversals | undefined>

type CompiledUnit = (
	dependencies: Fn[],
	refs: unknown[]
) => PrecompiledTraversals[]

const unitConstants = {
	addErrors,
	addMorphErrs,
	allowsInBranch,
	allowsInBranchBy,
	ArkErrors,
	arrayIndexMatcher,
	callMorph,
	copyOf,
	disallowed,
	errorFromUnion,
	holdsOnlyIndices,
	isIpv4,
	isIpv6,
	isIso8601,
	isNumericString,
	isUuid,
	isValidDate,
	isWellFormedInteger,
	jsTypeOfDescriptions,
	keepOwn,
	matchesRepeated,
	mergeTransformed,
	pipeApplied,
	pipeChecked,
	pipeTransformed,
	printable,
	rejected,
	rejects,
	timeOf,
	transformed,
	transformedInApply,
	transformsValid,
	TransformErrors
}

export type PrecompiledUnit = [
	bind: (
		root: BaseNode,
		constants: typeof unitConstants
	) => [declared: BaseNode[], refs: unknown[], dependencies: BaseNode[]],
	unitFn: CompiledUnit,
	// root key and traversal-kind index of each unit called
	dependencies: [key: string, kind: number][],
	// reference count, compared before hashing
	size: number
]

// a unit writes a traversal kind as its index here
const traversalKinds: readonly TraversalKind[] = [
	"Allows",
	"Apply",
	"Transform"
]

const precompiledUnits: Record<string, PrecompiledUnit> = Object.create(null)

export let bindPrecompiledUnits:
	| ((roots: readonly unknown[]) => void)
	| undefined

// sizes of registered units, so other roots skip keying
const registeredSizes: Record<number, true> = {}

export const registerPrecompiledUnits = (
	units: Record<string, PrecompiledUnit>
): void => {
	Object.assign(precompiledUnits, units)
	for (const key in units) registeredSizes[units[key][3]] = true
	bindPrecompiledUnits = bindRegisteredUnits
}

// largest roots first, so their units bind the most nodes
const bindRegisteredUnits = (values: readonly unknown[]): void => {
	const sized: [root: BaseRoot, size: number][] = []
	for (const value of values) {
		// a cyclic unit keys its resolutions by node id
		if (hasArkKind(value, "root") && !value.unitFn && !value.hasAlias)
			sized.push([value, sizeOf(value)])
	}
	sized.sort((l, r) => r[1] - l[1])
	for (const [root, size] of sized) {
		if (root.unitFn || !registeredSizes[size]) continue
		const precompiled = precompiledUnits[precompiledKeyOf(root)]
		if (precompiled) bindPrecompiled(root, precompiled)
	}
}

const bindPrecompiled = (
	root: BaseNode,
	[bind, unitFn, dependencies]: PrecompiledUnit
): void => {
	const [declared, refs, dependencyNodes] = bind(root, unitConstants)
	const traversals: Fn[] = []
	for (let i = 0; i < dependencies.length; i++) {
		const [key, kind] = dependencies[i]
		const dependency = dependencyNodes[i]
		if (!dependency.unitFn) bindPrecompiled(dependency, precompiledUnits[key])
		traversals.push(dependency[`t${traversalKinds[kind]}`]!)
	}
	bindUnit(declared, unitFn, unitFn(traversals, refs), root.byId)
}

// a tuple's defaults nest each thunk in an array of pairs
const forEachElement = (
	value: unknown,
	depth: number,
	f: (value: unknown) => void
): void => {
	if (depth && isArray(value))
		for (const element of value) forEachElement(element, depth - 1, f)
	else f(value)
}

let constantNames: Map<unknown, string> | undefined

const sizeOf = (root: BaseRoot): number => Object.keys(root.byId).length

// arity, the set engine, exactOptionalPropertyTypes and key order affect compiling but not the hash
const precompiledKeyOf = (root: BaseRoot): string => {
	let childCounts = ""
	for (const id in root.byId) {
		const node = root.byId[id]
		childCounts += `${node.children.length}${node.is("optional") && node.defaultsUndefined ? "u" : ""},`
		if (node.is("structure") && node.order)
			childCounts += `[${node.inOrder.map(prop => node.props.indexOf(prop))}]`
	}
	const content =
		root.hash.includes(`"$ark.`) ? keyRegisteredNames(root) : root.hash
	return hashOf(`${content}\n${childCounts}\n${$ark.sets !== undefined}`)
}

// registered names and minified function names vary by program
const keyRegisteredNames = (root: BaseRoot): string => {
	constantNames ??= new Map(
		Object.entries(unitConstants).map(([name, value]) => [value, name])
	)
	const kindsByName: Record<string, string> = Object.create(null)
	for (const id in root.byId) {
		const node = root.byId[id]
		for (const k in node.inner) {
			// a unit value's function name would shift later registrations
			forEachElement((node.inner as Dict)[k], k === "unit" ? 0 : 2, value => {
				const constant = constantNames!.get(value)
				if (constant) kindsByName[nameOf(value as object)] = `$.${constant}`
				else if (typeof value === "function" && !isNode(value)) {
					// only predicate and morph arity is compiled
					kindsByName[nameOf(value)] =
						node.is("predicate") || node.is("morph") ?
							`fn:${arityOf(value)}`
						:	"fn"
				}
			})
		}
	}
	const keysByName: Record<string, string> = {}
	let nameCount = 0
	const keyOfName = (name: string) => {
		const kind = kindsByName[name] ?? name.replace(/\$[1-9]\d*$/, "")
		return `${kind}#${nameCount++}`
	}
	return root.hash.replace(
		/(?<!\\)"\$ark\.([\w$]+)"/g,
		(_, name: string) => `"${(keysByName[name] ??= keyOfName(name))}"`
	)
}

const precompileReferences = (
	references: readonly BaseNode[],
	link: UnitLinkage
) => {
	const traversals = references.map(node => declareTraversals(link, node))
	for (let i = 0; i < link.reached.length; i++)
		traversals.push(declareTraversals(link, link.reached[i]))
	return writeUnit(
		Object.keys(link.dependencies),
		[...link.refs.values()],
		link.members,
		traversals
	)
}

const writeUnit = (
	dependencyNames: string[],
	refNames: string[],
	members: UnitMember[],
	traversals: string[][]
) => {
	// passed as arrays: too many args overflow a call
	const unit = new CompiledFunction<CompiledUnit, ["dependencies", "refs"]>(
		"dependencies",
		"refs"
	)
	// strict, as a module is
	unit.line(`"use strict"`)
	for (let i = 0; i < dependencyNames.length; i++)
		unit.const(dependencyNames[i], `dependencies[${i}]`)
	for (let i = 0; i < refNames.length; i++)
		unit.const(refNames[i], `refs[${i}]`)
	for (const [name, source] of members) unit.const(name, source)
	return unit.return(
		`[${traversals.map(names => `[${names.join(", ")}]`).join(", ")}]`
	)
}

export type UnitMember = [name: string, source: string]

const declareTraversals = (link: UnitLinkage, node: BaseNode): string[] => {
	const Compiler = link.opts.compiler
	const declared =
		Compiler?.prototype.declareTraversals &&
		new Compiler("Allows", link, true).declareTraversals!(node)
	if (declared) return declared
	const traversals = [
		declareTraversal(link, node, "Allows"),
		declareTraversal(link, node, "Apply")
	]
	// a prop or index signature is transformed by its structure
	if (node.tfs && includes(transformedKinds, node.kind))
		traversals.push(declareTraversal(link, node, "Transform"))
	return traversals
}

type UnitDependency = [node: BaseNode, kind: TraversalKind]

interface UnitLinkage {
	byId: Record<string, BaseNode>
	reused: Pick<ReadonlySet<BaseNode>, "has">
	unreached: Set<BaseNode>
	reached: BaseNode[]
	// each traversal of a reused node the unit calls, by the name it calls
	dependencies: Record<string, UnitDependency>
	refs: NodeCompiler.Refs
	members: UnitMember[]
	nameOf: ((id: NodeId) => string) | undefined
	opts: UnitOptions
	// the unit's name, once its content is named
	unit?: string | undefined
}

const noneReused: ReadonlySet<BaseNode> = new Set()

const createLinkage = (
	nameOf?: (id: NodeId) => string,
	opts: UnitOptions = {},
	unit?: string
): UnitLinkage => ({
	byId: {},
	reused: noneReused,
	unreached: new Set(),
	reached: [],
	dependencies: {},
	refs: new Map(),
	members: [],
	nameOf,
	opts,
	unit
})

export class TraversalCompiler extends NodeCompiler {
	/** how the units it writes reference one another */
	readonly link: UnitLinkage

	constructor(kind: TraversalKind, link: UnitLinkage, needsCtx: boolean) {
		super({
			kind,
			needsCtx,
			refs: link.refs
		})
		this.link = link
	}

	// declares a node's traversals some other way, returning their names
	declareTraversals?(node: BaseNode): string[] | undefined

	// a one-expression node is written inline
	override inv(node: BaseNode, opts?: InvokeOptions): string {
		this.reach(node)
		const expression =
			(
				(opts?.kind ?? this.trav) !== this.trav ||
				(opts?.arg ?? this.data) !== this.data
			) ?
				undefined
			: node.is("structure") ?
				// a structure sharing transformed keys applies them in a call of its own
				this.trav === "Apply" && node.sharesTfs ?
					undefined
				:	node.jsConjunction(this)
			:	node.jsExpression?.(this)
		return expression === undefined ? super.inv(node, opts) : `(${expression})`
	}

	override traversal(node: BaseNode, kind: TraversalKind): string {
		this.reach(node)
		return super.traversal(node, kind)
	}

	reach(node: BaseNode): void {
		if (!this.link.byId[node.id]) {
			this.link.byId[node.id] = node
			this.link.reached.push(node)
		}
	}

	// a node can be named without being invoked, e.g. an Allows passed
	override refToId(id: NodeId, opts?: ReferenceOptions): string {
		const reference = this.link.byId[id]
		if (reference && this.link.unreached.delete(reference))
			this.link.reached.push(reference)
		if (reference && this.link.reused.has(reference)) {
			const kind = opts?.kind ?? this.trav
			this.link.dependencies[`${this.nameOf(id)}${kind}`] = [reference, kind]
		}
		return super.refToId(id, opts)
	}

	override nameOf(id: NodeId): string {
		return this.link.nameOf?.(id) ?? super.nameOf(id)
	}

	override outline(
		name: string,
		args: readonly string[],
		body: (js: NodeCompiler) => unknown
	): this {
		const js = new (this.link.opts.compiler ?? TraversalCompiler)(
			this.trav,
			this.link,
			this.needsCtx
		).indent()
		js.checksErrs = this.checksErrs
		body(js)
		const params = [this.data, this.ctx, ...args]
		// the variable initializeTransform declares
		if (this.checksErrs) params.push(this.needsCtx ? "errN" : "failed")
		const list = params.join(", ")
		this.link.members.push([name, `function(${list}) { ${js.body} }`])
		return this.return(`${name}(${list})`)
	}
}

const transformedKinds = [
	"alias",
	"intersection",
	"morph",
	"sequence",
	"structure",
	"union"
] as const satisfies NodeKind[]

const declareTraversal = (
	link: UnitLinkage,
	node: BaseNode,
	kind: TraversalKind
): string => {
	const js = new (link.opts.compiler ?? TraversalCompiler)(
		kind,
		link,
		kind !== "Transform" || node.tfCtx
	).indent()
	node.compile(js)
	const name = js.refToId(node.id, { kind })
	link.members.push([name, js.write("function")])
	return name
}

type ContentKeyOf = (value: object | symbol) => string | undefined

export interface RootUnit {
	// its first root's name, which addresses it
	name: string
	names: Record<NodeId, string>
	// its component's roots, more than one only in a cycle
	roots: BaseRoot[]
	// each root's traversals, by name
	traversals: string[][]
	declared: BaseNode[]
	declaredTraversals: string[][]
	members: UnitMember[]
	refs: unknown[]
	dependencies: Record<string, UnitDependency>
	// nodes named by a value's identity, so unstable across passes
	identityNamed: ReadonlySet<NodeId>
	unitsById: Record<NodeId, RootUnit>
}

export const precompileRootUnits = (
	root: BaseRoot,
	opts: UnitOptions = {}
): RootUnit[] => unitsOf(nameContent([root], opts), opts)

interface UnitOptions {
	keyOf?: ContentKeyOf
	// standalone builds pass their own compiler
	compiler?: typeof TraversalCompiler
}

const unitsOf = (s: ContentNamingState, opts: UnitOptions): RootUnit[] => {
	const units: RootUnit[] = []
	const unitsById: Record<NodeId, RootUnit> = {}
	// a component is completed after every component it calls
	for (const component of s.components) {
		let written = s.written.units.get(component[0])
		if (!written || !readsMatch(written, component, s)) {
			written = writeComponent(component, s, opts)
			if (!written) continue
			s.written.units.set(component[0], written)
		}
		const unit: RootUnit = {
			name: written.name,
			names: s.names,
			roots: written.roots,
			traversals: written.declaredTraversals.slice(0, written.roots.length),
			declared: written.declared,
			declaredTraversals: written.declaredTraversals,
			members: written.members,
			refs: written.refs,
			dependencies: written.dependencies,
			identityNamed: s.identityNamed,
			unitsById
		}
		units.push(unit)
		for (const root of written.roots) unitsById[root.id] = unit
	}
	return units
}

// shared by a later pass reaching the component with the same names and nodes by id
interface WrittenUnit {
	component: readonly BaseNode[]
	namesRead: Map<NodeId, string | undefined>
	reachedRead: Map<NodeId, BaseNode | undefined>
	name: string
	roots: BaseRoot[]
	declared: BaseNode[]
	declaredTraversals: string[][]
	members: UnitMember[]
	refs: unknown[]
	dependencies: Record<string, UnitDependency>
}

const readsMatch = (
	written: WrittenUnit,
	component: readonly BaseNode[],
	s: ContentNamingState
): boolean => {
	if (written.component.length !== component.length) return false
	for (let i = 0; i < component.length; i++)
		if (written.component[i] !== component[i]) return false
	for (const [id, name] of written.namesRead)
		if (s.names[id] !== name) return false
	for (const [id, node] of written.reachedRead)
		if (s.byId[id]?.node !== node) return false
	return true
}

const writeComponent = (
	component: readonly BaseNode[],
	s: ContentNamingState,
	opts: UnitOptions
): WrittenUnit | undefined => {
	const namesRead = new Map<NodeId, string | undefined>()
	const readName = (id: NodeId) => {
		const name = s.names[id]
		namesRead.set(id, name)
		return name
	}
	const reachedRead = new Map<NodeId, BaseNode | undefined>()
	const reachedAt = (id: NodeId) => {
		const node = s.byId[id]?.node
		reachedRead.set(id, node)
		return node
	}
	const roots: BaseNode[] = component.filter(node => node.isRoot())
	roots.sort((l, r) => (readName(l.id) < readName(r.id) ? -1 : 1))
	if (!roots.length) return
	const declaredByName: Record<string, BaseNode> = {}
	const reached: BaseNode[] = [...roots]
	for (const node of reached) {
		if (declaredByName[readName(node.id)]) continue
		declaredByName[readName(node.id)] = node
		for (const callee of s.byId[node.id].callees)
			if (!callee.isRoot() || roots.includes(callee)) reached.push(callee)
	}
	const link = createLinkage(readName, opts, readName(roots[0].id))
	// reads through to what the pass reached
	link.byId = Object.create(
		new Proxy({}, { get: (_, id) => reachedAt(id as NodeId) })
	)
	// a reached root another component declares
	link.reused = {
		has: node =>
			reachedAt(node.id) === node &&
			node.isRoot() &&
			!declaredByName[readName(node.id)]
	}
	const declared = Object.values(declaredByName)
	const declaredTraversals = declared.map(node => declareTraversals(link, node))
	return {
		component,
		namesRead,
		reachedRead,
		name: readName(roots[0].id),
		roots: roots as BaseRoot[],
		declared,
		declaredTraversals,
		members: link.members,
		refs: [...link.refs.keys()],
		dependencies: link.dependencies
	}
}

interface ContentNamingState {
	byId: Record<NodeId, ContentReference>
	reached: BaseNode[]
	stack: ContentReference[]
	components: BaseNode[][]
	opts: UnitOptions
	valueIndices: Map<unknown, number>
	names: Record<NodeId, string>
	inputsByHash: Record<string, string>
	occurrencesById: Record<NodeId, number>
	identityNamed: Set<NodeId>
	written: WrittenByCompiler
}

// what a compiler, keying values as keyOf does, wrote of each node, by node
interface WrittenByCompiler {
	contents: WeakMap<BaseNode, WrittenContent>
	units: WeakMap<BaseNode, WrittenUnit>
}

const writtenByOptions = new Map<
	UnitOptions["compiler"],
	Map<ContentKeyOf | undefined, WrittenByCompiler>
>()

const writtenOf = (opts: UnitOptions): WrittenByCompiler => {
	let byKeyOf = writtenByOptions.get(opts.compiler)
	if (!byKeyOf) writtenByOptions.set(opts.compiler, (byKeyOf = new Map()))
	let written = byKeyOf.get(opts.keyOf)
	if (!written) {
		byKeyOf.set(
			opts.keyOf,
			(written = { contents: new WeakMap(), units: new WeakMap() })
		)
	}
	return written
}

// a node's content holding no value by identity
interface WrittenContent {
	content: string
	callees: BaseNode[]
	named?: [calleeNames: (string | undefined)[], input: string, hash: string]
}

const nameContent = (
	roots: readonly BaseNode[],
	opts: UnitOptions
): ContentNamingState => {
	const s = nameReferences(roots, {}, opts)
	const occurrencesById = occurrencesOfResolutions(s)
	return occurrencesById ? nameReferences(roots, occurrencesById, opts) : s
}

const nameReferences = (
	roots: readonly BaseNode[],
	occurrencesById: Record<NodeId, number>,
	opts: UnitOptions
): ContentNamingState => {
	const s: ContentNamingState = {
		byId: {},
		reached: [],
		stack: [],
		components: [],
		opts,
		valueIndices: new Map(),
		names: {},
		inputsByHash: {},
		occurrencesById,
		identityNamed: new Set(),
		written: writtenOf(opts)
	}
	for (const root of roots) if (!s.byId[root.id]) nameReference(s, root)
	return s
}

// content-equal nodes a cycle keys by id are numbered apart
const occurrencesOfResolutions = (
	s: ContentNamingState
): Record<NodeId, number> | undefined => {
	// only an alias or what it resolves to is numbered
	if (!s.reached.some(node => node.hasAlias)) return
	const resolutionIds: Record<NodeId, true> = {}
	const reachedByName: Record<string, BaseNode[]> = {}
	for (const node of s.reached) {
		if (node.is("alias")) resolutionIds[node.resolution.id] = true
		;(reachedByName[s.names[node.id]] ??= []).push(node)
	}
	let occurrencesById: Record<NodeId, number> | undefined
	for (const name in reachedByName) {
		const nodes = reachedByName[name]
		if (
			nodes.length === 1 ||
			!nodes.some(node => node.hasAlias || resolutionIds[node.id])
		)
			continue
		for (let i = 1; i < nodes.length; i++)
			(occurrencesById ??= {})[nodes[i].id] = i
	}
	return occurrencesById
}

interface ContentReference {
	node: BaseNode
	content: string
	holdsIdentity: boolean
	callees: BaseNode[]
	index: number
	lowLink: number
	// set where content is the same in any pass
	written: WrittenContent | undefined
}

// Tarjan's algorithm
const nameReference = (
	s: ContentNamingState,
	node: BaseNode
): ContentReference => {
	const reference = compileContent(s, node)
	s.byId[node.id] = reference
	s.reached.push(node)
	s.stack.push(reference)
	for (const callee of reference.callees) {
		const calleeReference = s.byId[callee.id]
		if (!calleeReference) {
			reference.lowLink = Math.min(
				reference.lowLink,
				nameReference(s, callee).lowLink
			)
		} else if (s.names[callee.id] === undefined) {
			// a reached node is unnamed only while its component is on the stack
			reference.lowLink = Math.min(reference.lowLink, calleeReference.index)
		}
	}
	if (reference.lowLink === reference.index) {
		const members = s.stack.splice(s.stack.lastIndexOf(reference))
		nameComponent(s, members)
		if (
			members.some(
				member =>
					member.holdsIdentity ||
					member.callees.some(callee => s.identityNamed.has(callee.id))
			)
		)
			for (const member of members) s.identityNamed.add(member.node.id)
		s.components.push(members.map(member => member.node))
	}
	return reference
}

const compileContent = (
	s: ContentNamingState,
	node: BaseNode
): ContentReference => {
	const occurrence = s.occurrencesById[node.id]
	const cached =
		occurrence === undefined ? s.written.contents.get(node) : undefined
	if (cached) {
		return {
			node,
			content: cached.content,
			holdsIdentity: false,
			callees: cached.callees,
			index: s.reached.length,
			lowLink: s.reached.length,
			written: cached
		}
	}
	const calleeIds: NodeId[] = []
	const positionsById: Record<NodeId, number> = {}
	const positionOf = (id: NodeId) =>
		id === node.id ? "$" : `$${(positionsById[id] ??= calleeIds.push(id) - 1)}`
	const link = createLinkage(positionOf, s.opts)
	declareTraversals(link, node)
	const serializing = new Set<object>()
	let holdsIdentity = false
	const serialize = (value: unknown): string => {
		if (isNode(value)) {
			link.byId[value.id] ??= value
			return positionOf(value.id)
		}
		if (!hasDomain(value, "object") && typeof value !== "symbol")
			return Object.is(value, -0) ? "-0" : serializePrimitive(value as never)
		const key =
			s.opts.keyOf?.(value) ??
			// arktype's own pattern instance is keyed by its source
			(value instanceof RegExp && isPatternInstanceIn(node, value) ?
				`${value}`
			:	undefined)
		if (key !== undefined) return key
		const prototype = typeof value === "object" && Object.getPrototypeOf(value)
		// a value containing itself is keyed by identity
		if (
			serializing.has(value as object) ||
			(!isArray(value) && prototype !== Object.prototype && prototype !== null)
		) {
			let i = s.valueIndices.get(value)
			if (i === undefined) s.valueIndices.set(value, (i = s.valueIndices.size))
			holdsIdentity = true
			return `v${i}`
		}
		serializing.add(value as object)
		const content =
			isArray(value) ?
				`[${value.map(serialize)}]`
			:	`{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${serialize(v)}`)}}`
		serializing.delete(value as object)
		return content
	}
	const content = [
		node.kind,
		// a program's nodes stay apart from another scope's
		...(node.$.isBuiltin ? [] : [serialize(node.$)]),
		...link.members.map(([name, source]) => `${name} = ${source}`),
		[...link.refs.keys()].map(serialize).join(),
		...(occurrence === undefined ? [] : [`#${occurrence}`])
	].join("\n")
	const callees = calleeIds.map(
		id =>
			link.byId[id] ??
			referenceOf(node, id) ??
			throwInternalError(`Unexpected unresolvable reference ${id}`)
	)
	let written: WrittenContent | undefined
	if (!holdsIdentity && occurrence === undefined)
		s.written.contents.set(node, (written = { content, callees }))
	return {
		node,
		content,
		holdsIdentity,
		callees,
		index: s.reached.length,
		lowLink: s.reached.length,
		written
	}
}

// nearest first through what node references, as an alias can replace a node sharing its id
const referenceOf = (node: BaseNode, id: NodeId): BaseNode | undefined => {
	if (node.c.byId) return node.byId[id]
	const queued = new Set<BaseNode>([node])
	for (const reference of queued) {
		if (reference.hasAlias) return node.byId[id]
		if (reference.id === id) return reference
		for (const child of reference.children) queued.add(child)
		for (const other of reference.otherRefs) queued.add(other)
	}
}

const isPatternInstanceIn = (node: BaseNode, value: RegExp): boolean => {
	for (const id in node.byId) {
		const reference = node.byId[id]
		if (reference.is("pattern") && reference.instance === value) return true
	}
	return false
}

// a cycle's members are ordered by content
const nameComponent = (
	s: ContentNamingState,
	members: ContentReference[]
): void => {
	if (members.length === 1 && members[0].written)
		return nameAlone(s, members[0].node, members[0].written)
	const positionsById: Record<NodeId, number> = {}
	for (let i = 0; i < members.length; i++) positionsById[members[i].node.id] = i
	const inputOf = (
		member: ContentReference,
		labelOf: (position: number) => string
	) =>
		`${member.content}\n${member.callees.map(callee => s.names[callee.id] ?? labelOf(positionsById[callee.id]))}`
	let labels = members.map(member => hashOf(inputOf(member, () => "#")))
	for (let round = 1; round < members.length; round++) {
		const refined = members.map(member =>
			hashOf(inputOf(member, i => labels[i]))
		)
		if (new Set(refined).size === new Set(labels).size) break
		labels = refined
	}
	const order = members
		.map((_, i) => i)
		.sort((l, r) =>
			labels[l] < labels[r] ? -1
			: labels[l] > labels[r] ? 1
			: l - r
		)
	const canonicalPositions: number[] = []
	for (let i = 0; i < order.length; i++) canonicalPositions[order[i]] = i
	const input = order
		.map(i => inputOf(members[i], j => `#${canonicalPositions[j]}`))
		.join("\n\n")
	const hash = hashOf(input)
	if ((s.inputsByHash[hash] ??= input) !== input)
		throwInternalError(`Unexpected hash collision for ${hash}`)
	for (let i = 0; i < members.length; i++) {
		const node = members[i].node
		s.names[node.id] =
			members.length === 1 ?
				`${node.kind}${hash}`
			:	`${node.kind}${hash}_${canonicalPositions[i]}`
	}
}

// a one-node component, named as nameComponent would
const nameAlone = (
	s: ContentNamingState,
	node: BaseNode,
	written: WrittenContent
): void => {
	const calleeNames = written.callees.map(callee => s.names[callee.id])
	let named = written.named
	if (
		!named ||
		named[0].length !== calleeNames.length ||
		named[0].some((name, i) => name !== calleeNames[i])
	) {
		// a callee unnamed here is the node itself, at position 0
		const input = `${written.content}\n${calleeNames.map(name => name ?? "#0")}`
		named = written.named = [calleeNames, input, hashOf(input)]
	}
	const [, input, hash] = named
	if ((s.inputsByHash[hash] ??= input) !== input)
		throwInternalError(`Unexpected hash collision for ${hash}`)
	s.names[node.id] = `${node.kind}${hash}`
}

export const writePrecompiledUnits = (
	roots: readonly BaseRoot[]
): Record<string, string> => {
	const unitsByKey: Record<string, string | undefined> = {}
	const keysById: Record<NodeId, string> = {}
	const keyOf = (root: BaseRoot) =>
		(keysById[root.id] ??= precompiledKeyOf(root))
	for (const root of roots) {
		if (root.hasAlias || keyOf(root) in unitsByKey) continue
		for (const unit of precompileRootUnits(root)) {
			const key = keyOf(unit.roots[0])
			if (!(key in unitsByKey))
				unitsByKey[key] = writePrecompiledUnit(unit, unitsByKey, keyOf)
		}
	}
	const written: Record<string, string> = {}
	for (const key of Object.keys(unitsByKey).sort())
		if (unitsByKey[key]) written[key] = unitsByKey[key]
	return written
}

const writePrecompiledUnit = (
	unit: RootUnit,
	unitsByKey: Record<string, string | undefined>,
	keyOf: (root: BaseRoot) => string
): string | undefined => {
	const root = unit.roots[0]
	const dependencies = Object.values(unit.dependencies).map(
		([node, kind]) =>
			[keyOf(node as BaseRoot), traversalKinds.indexOf(kind)] as const
	)
	// a unit calling an unwritable unit can't be written
	if (dependencies.some(([key]) => !unitsByKey[key])) return
	const nodes: BaseNode[] = [root]
	const variablesByNode = new Map<BaseNode, string>([[root, "n0"]])
	const variablesById: Record<string, string> = { [root.id]: "n0" }
	// each node after the root, by the index of the node it's read from
	const statements: [from: number, statement: string][] = []
	for (let i = 0; i < nodes.length; i++) {
		if (
			i !== 0 &&
			nodes[i].isRoot() &&
			!nodes[i].jsCond &&
			!isRefinedBasis(nodes[i])
		)
			continue
		for (const key of ["children", "otherRefs"] as const) {
			const referenced = nodes[i][key]
			for (let j = 0; j < referenced.length; j++) {
				if (variablesByNode.has(referenced[j])) continue
				const variable = `n${nodes.push(referenced[j]) - 1}`
				variablesByNode.set(referenced[j], variable)
				variablesById[referenced[j].id] ??= variable
				statements.push([
					i,
					`const ${variable} = ${variablesByNode.get(nodes[i])}.${key}[${j}]`
				])
			}
		}
	}
	const dependencyNodes = Object.values(unit.dependencies).map(([node]) => node)
	// a node outside the closure, e.g. a Type piped to, isn't keyed by its root
	if (
		[...unit.declared, ...dependencyNodes].some(node => !variablesById[node.id])
	)
		return
	const accessorsByValue = accessorsOf(nodes, variablesByNode)
	const refs = unit.refs.map(value => accessorsByValue.get(value))
	if (refs.includes(undefined)) return
	const source = writeUnit(
		Object.keys(unit.dependencies),
		unit.refs.map((_, i) => `r${i}`),
		unit.members,
		unit.declaredTraversals
	).write("function")
	const variablesOf = (nodes: BaseNode[]) =>
		nodes.map(node => variablesById[node.id]).join(", ")
	const returned = `return [[${variablesOf(unit.declared)}], [${refs.join(", ")}], [${variablesOf(dependencyNodes)}]]`
	// a node is declared only if something the unit returns is read from it
	const read = nodes.map(() => false)
	for (const [, i] of returned.matchAll(/\bn(\d+)\b/g)) read[+i] = true
	for (let i = statements.length; i > 0; i--)
		if (read[i]) read[statements[i - 1][0]] = true
	return `[(n0, $) => {
${statements.map(([, statement], i) => (read[i + 1] ? `\t${statement}\n` : "")).join("")}\t${returned}
}, ${source}, ${JSON.stringify(dependencies)}, ${sizeOf(root)}]`
}

// the expression reading each value a keyed root's nodes hold, undefined where none can
const accessorsOf = (
	nodes: readonly BaseNode[],
	variablesByNode: ReadonlyMap<BaseNode, string>
): Map<unknown, string | undefined> => {
	const accessorsByValue = new Map<unknown, string | undefined>(variablesByNode)
	for (const k in unitConstants) {
		accessorsByValue.set(
			unitConstants[k as keyof typeof unitConstants],
			`$.${k}`
		)
	}
	// keyed roots hold equal constants at each inner path
	for (const node of nodes) {
		forEachValue(node.inner, (value, path) => {
			if (!accessorsByValue.has(value))
				accessorsByValue.set(value, `${variablesByNode.get(node)}.inner${path}`)
		})
	}
	// a derived value two nodes share can't be bound
	const holdersByValue = new Map<unknown, BaseNode>()
	for (const node of nodes) {
		forEachValue(node, (value, path) => {
			const holder = holdersByValue.get(value)
			if (holder === undefined && !accessorsByValue.has(value)) {
				holdersByValue.set(value, node)
				accessorsByValue.set(value, `${variablesByNode.get(node)}${path}`)
			} else if (holder !== undefined && holder !== node)
				accessorsByValue.set(value, undefined)
		})
	}
	for (const node of nodes) {
		if ("errorCtx" in node || node.is("union") || node.is("structure")) {
			accessorsByValue.set(
				node.failSite,
				`${variablesByNode.get(node)}.failSite`
			)
		}
		// a structure's undeclared keys are checked against the props it indexes
		if (node.is("structure"))
			accessorsByValue.set(node.byKey, `${variablesByNode.get(node)}.byKey`)
	}
	return accessorsByValue
}

const forEachValue = (
	o: object,
	f: (value: object | symbol, path: string) => void
): void => {
	for (const k in o) {
		if (k[0] === "_") continue
		const v = (o as Dict)[k]
		if (hasDomain(v, "object") || typeof v === "symbol") f(v, `.${k}`)
		if (isArray(v)) {
			for (let i = 0; i < v.length; i++) {
				const element = v[i]
				if (hasDomain(element, "object") || typeof element === "symbol")
					f(element, `.${k}[${i}]`)
			}
		}
	}
}
