import {
	arityOf,
	arkKind,
	defineLazily,
	flatMorph,
	hashOf,
	hasDomain,
	hasOwn,
	includes,
	isArray,
	isThunk,
	isValidDate,
	jsTypeOfDescriptions,
	nameOf,
	ParseError,
	printable,
	serializePrimitive,
	throwInternalError,
	throwParseError,
	WeakCache,
	type Dict,
	type Fn,
	type Hkt,
	type JsonStructure,
	type anyOrNever,
	type array,
	type conform,
	type intersectUnion,
	type noSuggest,
	type satisfy,
	type show
} from "@ark/util"
import {
	mergeConfigs,
	resolveGlobalConfig,
	type ArkSchemaConfig,
	type ResolvedConfig
} from "./config.ts"
import {
	GenericRoot,
	LazyGenericBody,
	LazyGenericRoot,
	type GenericRootParser
} from "./generic.ts"
import { bootstrap } from "./intrinsic.ts"
import type { NodeInput, nodeOfKind, reducibleKindOf } from "./kinds.ts"
import {
	RootModule,
	bindModule,
	type InternalModule,
	type PreparsedNodeResolution,
	type SchemaModule,
	type instantiateRoot
} from "./module.ts"
import {
	referencesThroughAliases,
	rootApplyRuntimeOf,
	type BaseNode
} from "./node.ts"
import {
	nodesByRegisteredId,
	parseNode,
	registerNodeId,
	resolveDescription,
	withId,
	type AttachedParseContext,
	type BaseParseContext,
	type BaseParseContextInput,
	type BaseParseOptions,
	type NodeId
} from "./parse.ts"
import { parseSchema, type RootSchema } from "./parseSchema.ts"
import {
	isResolvable,
	resolveShallowAliases,
	type Alias
} from "./roots/alias.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { Union } from "./roots/union.ts"
import type { Unit } from "./roots/unit.ts"
import {
	CompiledFunction,
	isRefinedBasis,
	NodeCompiler,
	type InvokeOptions,
	type ReferenceOptions
} from "./shared/compile.ts"
import { errorFromUnion } from "./shared/errors.ts"
import { ArkErrors } from "./shared/issues.ts"
import { nodeKinds, type NodeKind } from "./shared/implement.ts"
import type { Locale } from "./shared/locale.ts"
import { $ark } from "./shared/registry.ts"
import { missingSetEngineMessage } from "./shared/sets.ts"
import {
	copyOf,
	holdsOnlyIndices,
	mergeTransformed,
	TransformErrors
} from "./shared/transform.ts"
import {
	addErrors,
	addTransformErrors,
	allowsInBranch,
	allowsInBranchBy,
	callMorph,
	matchesRepeated,
	pipeApplied,
	pipeChecked,
	pipeTransformed,
	rejected,
	rejects,
	transformed,
	transformedInApply,
	transformsValid,
	type Traversal,
	type TraversalKind,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "./shared/traversal.ts"
import {
	assertUnchecked,
	composing,
	defining,
	hasArkKind,
	inProgress,
	isAbsent,
	isNode,
	printSelfAsThis,
	resolving
} from "./shared/utils.ts"
import { arrayIndexMatcher } from "./structure/shared.ts"

export type InternalResolutions = Record<string, InternalResolution | undefined>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type resolvableReferenceIn<$> =
	[keyof $] extends [never] ? never
	: // most scopes have no key to filter, which this checks without distributing over keyof $
	[keyof $ & (PrivateDeclaration | noSuggest | "root")] extends [never] ?
		keyof $ & string
	:	| Exclude<
				keyof $ & string,
				// technically, root subtypes are resolvable, but there's never a good
				// reason to use them over the base alias
				PrivateDeclaration | noSuggest | "root"
		  >
		| privateAliasOf<Extract<keyof $, PrivateDeclaration>>

type privateAliasOf<k> =
	k extends PrivateDeclaration<infer alias> ? alias : never

export type resolveReference<reference extends resolvableReferenceIn<$>, $> =
	reference extends keyof $ ? $[reference] : $[`#${reference}` & keyof $]

export type flatResolutionsOf<$> = show<
	intersectUnion<
		resolvableReferenceIn<$> extends infer k ?
			k extends keyof $ & string ?
				resolutionsOfReference<k, $[k]>
			:	unknown
		:	unknown
	>
>

type resolutionsOfReference<k extends string, v> =
	[v] extends [{ [arkKind]: "module" }] ?
		[v] extends [anyOrNever] ?
			{ [_ in k]: v }
		:	prefixKeys<flatResolutionsOf<v>, k> & {
				[innerKey in keyof v as innerKey extends "root" ? k
				:	never]: v[innerKey]
			}
	:	{ [_ in k]: v }

type prefixKeys<o, prefix extends string> = {
	[k in keyof o & string as `${prefix}.${k}`]: o[k]
} & unknown

export type PrivateDeclaration<key extends string = string> = `#${key}`

export type InternalResolution = BaseRoot | GenericRoot | InternalModule

export type toInternalScope<$> = BaseScope<{
	[k in keyof $]: $[k] extends { [arkKind]: infer kind } ?
		[$[k]] extends [anyOrNever] ? BaseRoot
		: kind extends "generic" ? GenericRoot
		: kind extends "module" ? InternalModule
		: never
	:	BaseRoot
}>

type CachedResolution = BaseParseContext | BaseRoot | GenericRoot

const throwMismatchedNodeRootError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)

export const writeDuplicateAliasError = <alias extends string>(
	alias: alias
): writeDuplicateAliasError<alias> =>
	`#${alias} duplicates public alias ${alias}`

export type writeDuplicateAliasError<alias extends string> =
	`#${alias} duplicates public alias ${alias}`

export type AliasDefEntry = [name: string, defValue: unknown]

// Fallback counter for anonymous scopes; scopes are identified by instance
// identity rather than names to support HMR and multi-bundle environments.
let anonymousScopeCount = 0

// an option whose values but the default are installed by an import of arktype's
export type InstalledOption = "errors" | "mutatesInput"

export const writeMissingImportMessage = <
	option extends InstalledOption,
	value extends string
>(
	option: option,
	value: value
): writeMissingImportMessage<option, value> =>
	`${option}: ${value} requires import "arktype/${option}"`

export type writeMissingImportMessage<
	option extends InstalledOption,
	value extends string
> = `${option}: ${value} requires import "arktype/${option}"`

export type GlobalOnlyConfigOptionName = satisfy<
	keyof ArkSchemaConfig,
	| "dateAllowsInvalid"
	| "numberAllowsInfinity"
	| "numberAllowsNaN"
	| "onUndeclaredKey"
	| "keywords"
	| "locale"
>

export interface ScopeOnlyConfigOptions {
	name?: string
	prereducedAliases?: boolean
}

export interface ArkSchemaScopeConfig
	extends Omit<ArkSchemaConfig, GlobalOnlyConfigOptionName>,
		ScopeOnlyConfigOptions {}

export interface ResolvedScopeConfig
	extends ResolvedConfig,
		ScopeOnlyConfigOptions {}

$ark.ambient ??= {} as never

// leaves read no object property, so sharing them can't make an inline cache polymorphic
const isLeafIn = (
	node: BaseNode,
	referencesById: Record<string, BaseNode>
): boolean => {
	if (!node.isRoot()) return false
	for (const id in node.referencesById) {
		const reference = node.referencesById[id]
		if (
			reference !== referencesById[id] ||
			reference.hasKind("structure") ||
			reference.hasKind("alias")
		)
			return false
	}
	return true
}

const precompile = (
	references: readonly BaseNode[],
	owningScope?: BaseScope,
	unbound?: UnboundTraversals
): Fn => {
	const linkage = createLinkage()
	for (const node of references) linkage.referencesById[node.id] = node
	const declared: BaseNode[] = []
	for (const node of references) {
		if (node.isReusableLeaf && isLeafIn(node, linkage.referencesById))
			linkage.reused.add(node)
		else if (
			node.compiledUnit &&
			(!owningScope || node.$ !== owningScope) &&
			// compiling an alias can create nodes, so every unit declares its own
			!node.hasKind("alias")
		)
			linkage.unreached.add(node)
		else declared.push(node)
	}
	const compiledUnit = precompileReferences(declared, linkage).compile()
	bindUnit(
		declared,
		compiledUnit,
		compiledUnit(
			Object.values(linkage.dependencies).map(([node, kind]) => {
				const traverse: Fn = node[`traverse${kind}`]!
				// an uncompiled node's traversal is its method, which reads the node
				return hasOwn(node, `traverse${kind}`) ? traverse : traverse.bind(node)
			}),
			[...linkage.refs.keys()]
		),
		linkage.referencesById,
		owningScope,
		unbound
	)
	return compiledUnit
}

// a deferred Type binds its own nodes, so they can't hold another Type's unit and the values it references
const precompileRoot = (
	root: BaseNode,
	references: readonly BaseNode[]
): void => {
	const unbound: UnboundTraversals = new Map()
	for (const reference of references) {
		if (reference === root || !reference.allowsBeforeJit) continue
		for (const id in reference.referencesById)
			unbound.set(reference.referencesById[id], undefined)
	}
	// an apply checking data uncompiled to write in place reads no copy
	for (const node of $ark.inPlace?.checking ?? []) unbound.set(node, undefined)
	unbound.delete(root)
	precompile(references, undefined, unbound)
	// what an apply writing in place reads rather than compiling again
	if ($ark.inPlace) root.cache.unbound = unbound
}

// what a transform and Apply's transforms of the values it finds valid write
// in place, compiled for each node once a root writing in place reaches it,
// with the traversals of those it reaches that neither their own unit nor
// the root's (unbound) compiles
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
			traverseApply?: TraverseApply | undefined
			traverseTransform?: TraverseTransform | undefined
		}
	>()
	const include = (node: BaseNode): void => {
		// a node included is included with what it references
		if (linkage.referencesById[node.id]) return
		for (const reference of referencesThroughAliases([
			node,
			...node.references
		])) {
			if (linkage.referencesById[reference.id]) continue
			linkage.referencesById[reference.id] = reference
			const kinds: TraversalKind[] = []
			const isCompiled = !!reference.compiledUnit || !!unbound?.get(reference)
			if (!isCompiled) kinds.push("Allows")
			if (reference.transforms ? !reference.cache.applyInPlace : !isCompiled)
				kinds.push("Apply")
			if (
				reference.transforms &&
				includes(transformedKinds, reference.kind) &&
				!reference.cache.applyInPlace
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

		override referenceToId(id: NodeId, opts?: ReferenceOptions): string {
			const reference = this.linkage.referencesById[id]
			const kind = opts?.kind ?? this.traversalKind
			if (reference && !kindsByNode.get(reference)?.includes(kind)) {
				this.linkage.dependencies[`${this.nameOf(id)}${kind}`] = [
					reference,
					kind
				]
			}
			return super.referenceToId(id, opts)
		}

		override ref(value: object | symbol): string {
			if (!isNode(value) || !value.isRoot() || !value.transforms)
				return super.ref(value)
			include(value)
			let shape = shapes.get(value)
			if (!shape) shapes.set(value, (shape = Object.create(value) as {}))
			return super.ref(shape)
		}
	}
	const linkage = createLinkage(undefined, { compiler: InPlaceCompiler })
	include(root)
	const names: string[][] = []
	for (let i = 0; i < declared.length; i++) {
		const [node, kinds] = declared[i]
		names.push(kinds.map(kind => declareTraversal(linkage, node, kind)))
	}
	const compiledUnit = writeUnit(
		Object.keys(linkage.dependencies),
		[...linkage.refs.values()],
		linkage.members,
		names
	).compile()
	const traversals = compiledUnit(
		Object.values(linkage.dependencies).map(
			([node, kind]): Fn =>
				kind === "Allows" || !node.transforms ?
					(unbound?.get(node)?.[kind === "Allows" ? 0 : 1] ??
					node[`traverse${kind}`]!)
				: kind === "Apply" ? node.cache.applyInPlace!
				: node.cache.transformInPlace!
		),
		[...linkage.refs.keys()]
	)
	for (let i = 0; i < declared.length; i++) {
		const [node, kinds] = declared[i]
		if (!node.transforms) continue
		node.cache.applyInPlace = traversals[i][kinds.indexOf("Apply")] as never
		node.cache.transformInPlace = traversals[i][
			kinds.indexOf("Transform")
		] as never
	}
	for (const [node, shape] of shapes) {
		shape.traverseApply = node.cache.applyInPlace
		shape.traverseTransform = node.cache.transformInPlace
	}
}

const bindUnit = (
	declared: readonly BaseNode[],
	compiledUnit: CompiledUnit,
	compiledTraversals: PrecompiledTraversals[],
	referencesById: Record<string, BaseNode>,
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
		if (node.compiledUnit && (!owningScope || node.$ !== owningScope)) continue
		const [traverseAllows, traverseApply, traverseTransform] =
			compiledTraversals[i]
		if (node.allowsBeforeJit) {
			node.allows = node.allowsBeforeJit
			node.allowsBeforeJit = undefined
		}
		node.traverseAllows = traverseAllows
		if (node.isRoot() && !node.allowsRequiresContext) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = traverseAllows as never
		}
		node.traverseApply = traverseApply
		if (traverseTransform) node.traverseTransform = traverseTransform
		node.compiledUnit = compiledUnit
		delete node.cache.rootApply
		node.isReusableLeaf = isLeafIn(node, referencesById)
	}
}

type PrecompiledTraversals = [
	allows: TraverseAllows,
	apply: TraverseApply,
	transform?: TraverseTransform
]

// the traversals a root's unit compiles for nodes it doesn't bind, as
// another Type's
export type UnboundTraversals = Map<BaseNode, PrecompiledTraversals | undefined>

type CompiledUnit = (
	dependencies: Fn[],
	refs: unknown[]
) => PrecompiledTraversals[]

const unitConstants = {
	addErrors,
	addTransformErrors,
	allowsInBranch,
	allowsInBranchBy,
	ArkErrors,
	arrayIndexMatcher,
	callMorph,
	copyOf,
	errorFromUnion,
	holdsOnlyIndices,
	isAbsent,
	isValidDate,
	jsTypeOfDescriptions,
	matchesRepeated,
	mergeTransformed,
	pipeApplied,
	pipeChecked,
	pipeTransformed,
	printable,
	rejected,
	rejects,
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
	compiledUnit: CompiledUnit,
	// each root the unit calls, by the key of its own unit, and the index of its traversal kind
	dependencies: [key: string, kind: number][],
	// its root's number of references, which a root reads without hashing its content
	size: number
]

// a unit writes the traversal kind it calls a root with as its index here
const traversalKinds: readonly TraversalKind[] = [
	"Allows",
	"Apply",
	"Transform"
]

const precompiledUnits: Record<string, PrecompiledUnit> = Object.create(null)

// assigned on registration, so a bundle that registers no units leaves binding them out
let bindPrecompiledUnits: ((roots: readonly unknown[]) => void) | undefined

// a root of a size no registered unit has misses without being keyed
const registeredSizes: Record<number, true> = {}

export const registerPrecompiledUnits = (
	units: Record<string, PrecompiledUnit>
): void => {
	Object.assign(precompiledUnits, units)
	for (const key in units) registeredSizes[units[key][3]] = true
	bindPrecompiledUnits = bindRegisteredUnits
}

// a bound root binds the roots its unit calls, so the largest are bound first and need the fewest keys
const bindRegisteredUnits = (values: readonly unknown[]): void => {
	const sized: [root: BaseRoot, size: number][] = []
	for (const value of values) {
		// a cyclic unit keys its resolutions by node id
		if (
			hasArkKind(value, "root") &&
			!value.compiledUnit &&
			!value.includesAlias
		)
			sized.push([value, sizeOf(value)])
	}
	sized.sort((l, r) => r[1] - l[1])
	for (const [root, size] of sized) {
		if (root.compiledUnit || !registeredSizes[size]) continue
		const precompiled = precompiledUnits[precompiledKeyOf(root)]
		if (precompiled) bindPrecompiled(root, precompiled)
	}
}

const bindPrecompiled = (
	root: BaseNode,
	[bind, compiledUnit, dependencies]: PrecompiledUnit
): void => {
	const [declared, refs, dependencyNodes] = bind(root, unitConstants)
	const traversals: Fn[] = []
	for (let i = 0; i < dependencies.length; i++) {
		const [key, kind] = dependencies[i]
		const dependency = dependencyNodes[i]
		if (!dependency.compiledUnit)
			bindPrecompiled(dependency, precompiledUnits[key])
		traversals.push(dependency[`traverse${traversalKinds[kind]}`]!)
	}
	bindUnit(
		declared,
		compiledUnit,
		compiledUnit(traversals, refs),
		root.referencesById
	)
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

// built when a root is first keyed, so a bundle that registers no units leaves it out
let constantNames: Map<unknown, string> | undefined

const sizeOf = (root: BaseRoot): number =>
	Object.keys(root.referencesById).length

// compiling reads each function's arity and whether the set engine is installed, neither in the hash
const precompiledKeyOf = (root: BaseRoot): string => {
	// a child the hash leaves out, like an empty structure, is still compiled and bound
	let childCounts = ""
	for (const id in root.referencesById)
		childCounts += `${root.referencesById[id].children.length},`
	const content =
		root.hash.includes(`"$ark.`) ? keyRegisteredNames(root) : root.hash
	return hashOf(`${content}\n${childCounts}\n${$ark.sets !== undefined}`)
}

// a registered name's count depends on what was registered before, and a function's name on whether it was minified
const keyRegisteredNames = (root: BaseRoot): string => {
	constantNames ??= new Map(
		Object.entries(unitConstants).map(([name, value]) => [value, name])
	)
	// a unit binds a constant it holds as the constant, so only a root holding that constant can share it
	const kindsByName: Record<string, string> = Object.create(null)
	for (const id in root.referencesById) {
		const node = root.referencesById[id]
		for (const k in node.inner) {
			// a unit's value is the program's, and naming a function in it would shift the names later Types register
			forEachElement((node.inner as Dict)[k], k === "unit" ? 0 : 2, value => {
				const constant = constantNames!.get(value)
				if (constant) kindsByName[nameOf(value as object)] = `$.${constant}`
				else if (typeof value === "function" && !isNode(value)) {
					// only a predicate's or morph's arity is compiled, and reading another's mustn't record it
					kindsByName[nameOf(value)] =
						`fn:${node.hasKind("predicate") || node.hasKind("morph") ? arityOf(value) : value.length}`
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
	linkage: UnitLinkage
) => {
	const traversals = references.map(node => declareTraversals(linkage, node))
	for (let i = 0; i < linkage.reached.length; i++)
		declareTraversals(linkage, linkage.reached[i])
	return writeUnit(
		Object.keys(linkage.dependencies),
		[...linkage.refs.values()],
		linkage.members,
		traversals
	)
}

const writeUnit = (
	dependencyNames: string[],
	refNames: string[],
	members: UnitMember[],
	traversals: string[][]
) => {
	// passed as arrays, as V8 can't call a function with tens of thousands of arguments
	const unit = new CompiledFunction<CompiledUnit, ["dependencies", "refs"]>(
		"dependencies",
		"refs"
	)
	// strict as a module is, so writing to a frozen input copyOf left uncopied throws
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

const declareTraversals = (linkage: UnitLinkage, node: BaseNode): string[] => {
	const traversals = [
		declareTraversal(linkage, node, "Allows"),
		declareTraversal(linkage, node, "Apply")
	]
	// a prop or index signature is transformed by its structure
	if (node.transforms && includes(transformedKinds, node.kind))
		traversals.push(declareTraversal(linkage, node, "Transform"))
	return traversals
}

export type UnitDependency = [node: BaseNode, kind: TraversalKind]

interface UnitLinkage {
	referencesById: Record<string, BaseNode>
	reused: Set<BaseNode>
	unreached: Set<BaseNode>
	reached: BaseNode[]
	// each traversal of a reused node the unit calls, by the name it calls
	dependencies: Record<string, UnitDependency>
	refs: NodeCompiler.Refs
	members: UnitMember[]
	nameOf: ((id: NodeId) => string) | undefined
	opts: UnitOptions
}

const createLinkage = (
	nameOf?: (id: NodeId) => string,
	opts: UnitOptions = {}
): UnitLinkage => ({
	referencesById: {},
	reused: new Set(),
	unreached: new Set(),
	reached: [],
	dependencies: {},
	refs: new Map(),
	members: [],
	nameOf,
	opts
})

export class TraversalCompiler extends NodeCompiler {
	readonly linkage: UnitLinkage

	constructor(
		kind: TraversalKind,
		linkage: UnitLinkage,
		requiresContext: boolean
	) {
		super({
			kind,
			requiresContext,
			refs: linkage.refs
		})
		this.linkage = linkage
	}

	// a node checked by one expression is written in the body that would call it
	override invoke(node: BaseNode, opts?: InvokeOptions): string {
		this.reach(node)
		const expression =
			(
				(opts?.kind ?? this.traversalKind) !== this.traversalKind ||
				(opts?.arg ?? this.data) !== this.data
			) ?
				undefined
			: node.hasKind("structure") ?
				// a structure sharing transformed keys applies them in a call of its own
				this.traversalKind === "Apply" && node.sharesTransformedKeys ?
					undefined
				:	node.compileConjunction(this)
			:	node.compileExpression?.(this)
		return expression === undefined ?
				super.invoke(node, opts)
			:	`(${expression})`
	}

	override traversal(node: BaseNode, kind: TraversalKind): string {
		this.reach(node)
		return super.traversal(node, kind)
	}

	reach(node: BaseNode): void {
		if (!this.linkage.referencesById[node.id]) {
			this.linkage.referencesById[node.id] = node
			this.linkage.reached.push(node)
		}
	}

	// code can name a node it doesn't invoke, like the Allows passed to allowsInBranchBy, which the unit then declares or takes from the unit it reuses
	override referenceToId(id: NodeId, opts?: ReferenceOptions): string {
		const reference = this.linkage.referencesById[id]
		if (reference && this.linkage.unreached.delete(reference))
			this.linkage.reached.push(reference)
		if (reference && this.linkage.reused.has(reference)) {
			const kind = opts?.kind ?? this.traversalKind
			this.linkage.dependencies[`${this.nameOf(id)}${kind}`] = [reference, kind]
		}
		return super.referenceToId(id, opts)
	}

	override nameOf(id: NodeId): string {
		return this.linkage.nameOf?.(id) ?? super.nameOf(id)
	}

	override outline(
		name: string,
		args: readonly string[],
		body: (js: NodeCompiler) => unknown
	): this {
		const js = new (this.linkage.opts.compiler ?? TraversalCompiler)(
			this.traversalKind,
			this.linkage,
			this.requiresContext
		).indent()
		js.checksTransformErrors = this.checksTransformErrors
		body(js)
		const params = [this.data, this.ctx, ...args]
		// the variable initializeTransform declares
		if (this.checksTransformErrors)
			params.push(this.requiresContext ? "errorCount" : "failed")
		const list = params.join(", ")
		this.linkage.members.push([name, `function(${list}) { ${js.body} }`])
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
	linkage: UnitLinkage,
	node: BaseNode,
	kind: TraversalKind
): string => {
	const js = new (linkage.opts.compiler ?? TraversalCompiler)(
		kind,
		linkage,
		kind !== "Transform" || node.transformRequiresContext
	).indent()
	node.compile(js)
	const name = js.referenceToId(node.id, { kind })
	linkage.members.push([name, js.write("function")])
	return name
}

export type ContentKeyOf = (value: object | symbol) => string | undefined

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
	// the nodes whose names hold a value keyed by identity, which name them only within this pass
	identityNamed: ReadonlySet<NodeId>
	unitsById: Record<NodeId, RootUnit>
}

// each root's unit holds the nodes it reaches before another root, so a prop's traversal is shared only by Types sharing the root it belongs to
export const precompileRootUnits = (
	root: BaseRoot,
	opts: UnitOptions = {}
): RootUnit[] => unitsOf(nameContent([root], opts), opts)

export interface UnitOptions {
	keyOf?: ContentKeyOf
	// a standalone build's, whose validators raise issues holding none of their nodes' error contexts
	compiler?: typeof TraversalCompiler
}

const unitsOf = (s: ContentNamingState, opts: UnitOptions): RootUnit[] => {
	const units: RootUnit[] = []
	const unitsById: Record<NodeId, RootUnit> = {}
	// a component is completed after every component it calls
	for (const component of s.components) {
		const roots: BaseNode[] = component.filter(node => node.isRoot())
		roots.sort((l, r) => (s.names[l.id] < s.names[r.id] ? -1 : 1))
		if (!roots.length) continue
		const declaredByName: Record<string, BaseNode> = {}
		const reached: BaseNode[] = [...roots]
		for (const node of reached) {
			if (declaredByName[s.names[node.id]]) continue
			declaredByName[s.names[node.id]] = node
			for (const callee of s.referencesById[node.id].callees)
				if (!callee.isRoot() || roots.includes(callee)) reached.push(callee)
		}
		const linkage = createLinkage(id => s.names[id], opts)
		for (const node of s.reached) {
			linkage.referencesById[node.id] = node
			if (node.isRoot() && !declaredByName[s.names[node.id]])
				linkage.reused.add(node)
		}
		const declared = Object.values(declaredByName)
		const declaredTraversals = declared.map(node =>
			declareTraversals(linkage, node)
		)
		const unit: RootUnit = {
			name: s.names[roots[0].id],
			names: s.names,
			roots: roots as BaseRoot[],
			traversals: declaredTraversals.slice(0, roots.length),
			declared,
			declaredTraversals,
			members: linkage.members,
			refs: [...linkage.refs.keys()],
			dependencies: linkage.dependencies,
			identityNamed: s.identityNamed,
			unitsById
		}
		units.push(unit)
		for (const root of roots) unitsById[root.id] = unit
	}
	return units
}

interface ContentNamingState {
	referencesById: Record<NodeId, ContentReference>
	reached: BaseNode[]
	stack: ContentReference[]
	components: BaseNode[][]
	opts: UnitOptions
	valueIndices: Map<unknown, number>
	names: Record<NodeId, string>
	inputsByHash: Record<string, string>
	occurrencesById: Record<NodeId, number>
	identityNamed: Set<NodeId>
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
		referencesById: {},
		reached: [],
		stack: [],
		components: [],
		opts,
		valueIndices: new Map(),
		names: {},
		inputsByHash: {},
		occurrencesById,
		identityNamed: new Set()
	}
	for (const root of roots)
		if (!s.referencesById[root.id]) nameReference(s, root)
	return s
}

// the JIT keys a resolution by its node's id, so content-equal nodes a cycle can key are numbered apart in reach order
const occurrencesOfResolutions = (
	s: ContentNamingState
): Record<NodeId, number> | undefined => {
	const resolutionIds: Record<NodeId, true> = {}
	const reachedByName: Record<string, BaseNode[]> = {}
	for (const node of s.reached) {
		if (node.hasKind("alias")) resolutionIds[node.resolution.id] = true
		;(reachedByName[s.names[node.id]] ??= []).push(node)
	}
	let occurrencesById: Record<NodeId, number> | undefined
	for (const name in reachedByName) {
		const nodes = reachedByName[name]
		if (
			nodes.length === 1 ||
			!nodes.some(node => node.includesAlias || resolutionIds[node.id])
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
}

// Tarjan's algorithm, which completes a component only after every component it calls
const nameReference = (
	s: ContentNamingState,
	node: BaseNode
): ContentReference => {
	const reference = compileContent(s, node)
	s.referencesById[node.id] = reference
	s.reached.push(node)
	s.stack.push(reference)
	for (const callee of reference.callees) {
		const calleeReference = s.referencesById[callee.id]
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
	const calleeIds: NodeId[] = []
	const positionsById: Record<NodeId, number> = {}
	const positionOf = (id: NodeId) =>
		id === node.id ? "$" : `$${(positionsById[id] ??= calleeIds.push(id) - 1)}`
	const linkage = createLinkage(positionOf, s.opts)
	declareTraversals(linkage, node)
	const serializing = new Set<object>()
	let holdsIdentity = false
	const serialize = (value: unknown): string => {
		if (isNode(value)) {
			linkage.referencesById[value.id] ??= value
			return positionOf(value.id)
		}
		if (!hasDomain(value, "object") && typeof value !== "symbol")
			return Object.is(value, -0) ? "-0" : serializePrimitive(value as never)
		const key =
			s.opts.keyOf?.(value) ??
			// arktype's own pattern instance is keyed by its source, as no program can write it, unlike any other Date or RegExp
			(value instanceof RegExp && isPatternInstanceIn(node, value) ?
				`${value}`
			:	undefined)
		if (key !== undefined) return key
		const prototype = typeof value === "object" && Object.getPrototypeOf(value)
		// a value inside itself has no finite content, so like an instance it's keyed by identity
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
	const occurrence = s.occurrencesById[node.id]
	const content = [
		node.kind,
		// a program's scope keeps its nodes apart from content-equal ones of another
		...(node.$.isBuiltin ? [] : [serialize(node.$)]),
		...linkage.members.map(([name, source]) => `${name} = ${source}`),
		[...linkage.refs.keys()].map(serialize).join(),
		...(occurrence === undefined ? [] : [`#${occurrence}`])
	].join("\n")
	return {
		node,
		content,
		holdsIdentity,
		callees: calleeIds.map(
			id =>
				linkage.referencesById[id] ??
				node.referencesById[id] ??
				throwInternalError(`Unexpected unresolvable reference ${id}`)
		),
		index: s.reached.length,
		lowLink: s.reached.length
	}
}

// a parent writing its patterns' checks in its own body holds their instances
const isPatternInstanceIn = (node: BaseNode, value: RegExp): boolean => {
	for (const id in node.referencesById) {
		const reference = node.referencesById[id]
		if (reference.hasKind("pattern") && reference.instance === value)
			return true
	}
	return false
}

// a cycle's members are ordered by content, so their names don't depend on which was reached first
const nameComponent = (
	s: ContentNamingState,
	members: ContentReference[]
): void => {
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

export const writePrecompiledUnits = (
	roots: readonly BaseRoot[]
): Record<string, string> => {
	const unitsByKey: Record<string, string | undefined> = {}
	const keysById: Record<NodeId, string> = {}
	const keyOf = (root: BaseRoot) =>
		(keysById[root.id] ??= precompiledKeyOf(root))
	for (const root of roots) {
		if (root.includesAlias || keyOf(root) in unitsByKey) continue
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
	// a unit follows those it calls, so one calling a unit that couldn't be written can't be either
	if (dependencies.some(([key]) => !unitsByKey[key])) return
	const nodes: BaseNode[] = [root]
	const variablesByNode = new Map<BaseNode, string>([[root, "n0"]])
	const variablesById: Record<string, string> = { [root.id]: "n0" }
	// each node after the root, by the index of the node it's read from
	const statements: [from: number, statement: string][] = []
	// each node is read through the edges referencesById is collected from, up to the roots no parent checks inline, whose own units bind them
	for (let i = 0; i < nodes.length; i++) {
		if (
			i !== 0 &&
			nodes[i].isRoot() &&
			!nodes[i].compileCondition &&
			!isRefinedBasis(nodes[i])
		)
			continue
		for (const key of ["children", "referencedBesidesChildren"] as const) {
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
	const accessorsByValue = new Map<unknown, string | undefined>(variablesByNode)
	for (const k in unitConstants) {
		accessorsByValue.set(
			unitConstants[k as keyof typeof unitConstants],
			`$.${k}`
		)
	}
	// a root with the same key holds the same constant, or a value of the same kind, at each inner path
	for (const node of nodes) {
		forEachValue(node.inner, (value, path) => {
			if (!accessorsByValue.has(value))
				accessorsByValue.set(value, `${variablesByNode.get(node)}.inner${path}`)
		})
	}
	// any other field holds a value derived for its own node, so one two nodes hold can't be bound
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
		if (
			"errorContext" in node ||
			node.hasKind("union") ||
			node.hasKind("structure")
		) {
			accessorsByValue.set(
				node.failureSite,
				`${variablesByNode.get(node)}.failureSite`
			)
		}
		// a structure's undeclared keys are checked against the props it indexes
		if (node.hasKind("structure")) {
			accessorsByValue.set(
				node.propsByKey,
				`${variablesByNode.get(node)}.propsByKey`
			)
		}
		// a discriminant miss reads what the union's getters derive
		if (node.hasKind("union") && node.compiledDiscriminant) {
			const variable = variablesByNode.get(node)
			accessorsByValue.set(
				node.discriminantCases.cases,
				`${variable}.discriminantCases.cases`
			)
			accessorsByValue.set(
				node.discriminantMeta,
				`${variable}.discriminantMeta`
			)
			accessorsByValue.set(
				node.compiledDiscriminant.path,
				`${variable}.discriminant.path`
			)
		}
	}
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

const registerParseContext = <ctx extends BaseParseContext>(ctx: ctx): ctx =>
	(nodesByRegisteredId[ctx.id] = ctx)

export abstract class BaseScope<$ extends {} = {}> {
	readonly name: string
	readonly isBuiltin: boolean
	readonly scopeConfig: ArkSchemaScopeConfig | undefined

	get [arkKind](): "scope" {
		return "scope"
	}

	private _referencesById: { [id: string]: BaseNode } | undefined
	// collected when first read, since a scope exports without them unless it binds precompiled units or includes an alias
	get referencesById(): { [id: string]: BaseNode } {
		if (!this._referencesById && this._exportedResolutions) {
			this._referencesById = {}
			for (const name in this._exportedResolutions) {
				const resolution = this._exportedResolutions[name]
				if (isNode(resolution))
					addReferences(this._referencesById, resolution.referencesById)
			}
		}
		return this._referencesById ?? {}
	}

	private _references: readonly BaseNode[] | undefined
	get references(): readonly BaseNode[] {
		if (!this._references && this._exportedResolutions) {
			const references = Object.values(this.referencesById)
			this._references =
				this.lazyExports ? references : referencesThroughAliases(references)
		}
		return this._references ?? []
	}

	readonly resolutions: {
		[alias: string]: CachedResolution | undefined
	} = Object.create(null)
	private readonly boundReferences = new WeakMap<
		BaseNode | GenericRoot,
		BaseNode | GenericRoot
	>()

	exportedNames: string[] = []
	readonly aliases: Record<string, unknown> = {}
	resolved = false
	readonly nodesByKey: WeakCache<BaseNode> = new WeakCache()

	constructor(
		/** The set of names defined at the root-level of the scope mapped to their
		 * corresponding definitions.**/
		def: Record<string, unknown>,
		config?: ArkSchemaScopeConfig,
		isBuiltin = false
	) {
		this.name = config?.name ?? `anonymousScope${anonymousScopeCount++}`
		this.isBuiltin = isBuiltin
		this.scopeConfig = config

		const aliasEntries = Object.entries(def).map(entry =>
			this.preparseOwnAliasEntry(...entry)
		)

		for (const [k, v] of aliasEntries) {
			let name = k
			if (k[0] === "#") {
				name = k.slice(1)
				if (hasOwn(this.aliases, name))
					throwParseError(writeDuplicateAliasError(name))
				this.aliases[name] = v
			} else {
				if (hasOwn(this.aliases, name))
					throwParseError(writeDuplicateAliasError(k))
				this.aliases[name] = v
				this.exportedNames.push(name)
			}
			if (
				!hasArkKind(v, "module") &&
				!hasArkKind(v, "generic") &&
				!isThunk(v)
			) {
				const preparsed = this.preparseOwnDefinitionFormat(v, { alias: name })
				this.resolutions[name] =
					hasArkKind(preparsed, "root") ?
						this.bindReference(preparsed)
					:	this.createParseContext(preparsed)
			}
		}
	}

	get config(): ArkSchemaScopeConfig {
		return mergeConfigs($ark.config, this.scopeConfig)
	}

	get resolvedConfig(): ResolvedScopeConfig {
		// the first read fixes the global config, so configure throws after it
		const globalConfig = ($ark.resolvedConfig ??= resolveGlobalConfig(
			$ark.defaultConfig
		))
		const resolvedConfig = mergeConfigs(globalConfig, this.scopeConfig)
		const missing: InstalledOption | undefined =
			resolvedConfig.errors !== "all" && !$ark.errorModes ? "errors"
			: resolvedConfig.mutatesInput && !$ark.inPlace ? "mutatesInput"
			: undefined
		if (missing) {
			throwParseError(
				writeMissingImportMessage(missing, printable(resolvedConfig[missing]))
			)
		}
		// locale is global-only, though an untyped config can pass one
		if (resolvedConfig.locale !== globalConfig.locale)
			(resolvedConfig as { locale: Locale }).locale = globalConfig.locale
		return this.cacheGetter("resolvedConfig", resolvedConfig)
	}

	get intrinsic(): Omit<typeof $ark.intrinsic, `json${string}`> {
		// intrinsic won't be available during bootstrapping,  so we lie
		// about the type here as an extrnal convenience
		const bound = {} as never
		const intrinsic = $ark.intrinsic
		for (const k in intrinsic) {
			// don't include cyclic aliases from JSON scope
			if (k.startsWith("json")) continue
			defineLazily(bound, k, () =>
				this.bindKeyword(intrinsic[k as keyof typeof intrinsic])
			)
		}
		return this.cacheGetter("intrinsic", bound)
	}

	protected cacheGetter<name extends keyof this>(
		name: name,
		value: this[name]
	): this[name] {
		if (Object.isExtensible(this)) Object.defineProperty(this, name, { value })
		return value
	}

	get internal(): this {
		return this
	}

	private _json: JsonStructure | undefined
	get json(): JsonStructure {
		if (!this._json) {
			this.export()
			this._json = resolutionsToJson(this._exportedResolutions!)
		}
		return this._json
	}

	defineSchema<def extends RootSchema>(def: def): def {
		return def
	}

	generic: GenericRootParser = (...params) => {
		const $: BaseScope = this as never
		return (def: unknown, possibleHkt?: Hkt.constructor) =>
			new GenericRoot(
				params,
				possibleHkt ?
					// wrapped rather than bound, since binding reads the body's name and length
					new LazyGenericBody(args => (def as Fn)(args))
				:	def,
				$,
				$,
				possibleHkt ?? null
			) as never
	}

	units = (values: array, opts?: BaseParseOptions): BaseRoot => {
		const uniqueValues: unknown[] = []
		for (const value of values)
			if (!uniqueValues.includes(value)) uniqueValues.push(value)

		const branches = uniqueValues.map(unit => this.node("unit", { unit }, opts))
		return this.node(
			"union",
			{ branches },
			{
				...opts,
				prereduced: true
			}
		)
	}

	lazilyResolve(
		resolve: () => BaseRoot,
		reference: string = registerNodeId("synthetic"),
		operator?: string,
		operands?: readonly BaseRoot[]
	): Alias.Node {
		return this.node(
			"alias",
			operator && operands ?
				{ reference, resolve, operator, operands }
			:	{ reference, resolve },
			{ prereduced: true }
		)
	}

	schema = (schema: RootSchema, opts?: BaseParseOptions): BaseRoot =>
		this.finalize(parseSchema(schema, this, opts))

	bindReference<reference extends BaseNode | GenericRoot>(
		reference: reference
	): reference {
		if (
			reference.$ === this ||
			(isNode(reference) && reference.hasKind("alias"))
		)
			return reference
		// bound once per scope, since a bound node is as immutable as the node it copies
		let bound = this.boundReferences.get(reference)
		if (!bound) {
			bound =
				isNode(reference) ?
					composing(() => {
						const copy = new (reference.constructor as any)(reference, this)
						// a bound node keeps the descriptions of the scope that created it
						if (
							reference.includesKeptDescription ||
							!this.describesLike(reference.$)
						) {
							copy.includesKeptDescription = true
							copy._description = reference.description
						}
						return resolveDescription(copy as BaseNode)
					})
				:	new GenericRoot(
						reference.params as never,
						reference.bodyDef,
						reference.$,
						this as never,
						reference.hkt,
						reference.alias
					)
			this.boundReferences.set(reference, bound)
		}
		return bound as never
	}

	// a keyword resolved by name is described by this scope all the way down,
	// except through a cycle, which would be printed unrolled
	bindKeyword<reference extends BaseNode | GenericRoot>(
		reference: reference
	): reference {
		if (
			!isNode(reference) ||
			reference.isCyclic ||
			this.describesLike(reference.$)
		)
			return this.bindReference(reference)
		return reference.transform((kind, inner) => inner, {
			bindScope: this,
			prereduced: true
		}) as never
	}

	private describesLike($: BaseScope): boolean {
		return nodeKinds.every(
			kind =>
				this.resolvedConfig[kind].description ===
				$.resolvedConfig[kind].description
		)
	}

	resolveRoot(name: string): BaseRoot {
		return (
			this.maybeResolveRoot(name) ??
			throwParseError(writeUnresolvableMessage(name))
		)
	}

	maybeResolveRoot(name: string): BaseRoot | undefined {
		const result = this.maybeResolve(name)
		if (hasArkKind(result, "generic")) return
		return result
	}

	/** If name is a valid reference to a submodule alias, return its resolution  */
	protected maybeResolveSubalias(
		name: string
	): BaseRoot | GenericRoot | undefined {
		const resolution =
			(this.lazyExports && maybeResolveExport(this.lazyExports, name)) ??
			maybeResolveSubalias(this.aliases, name)
		if (resolution) return resolution
		const keyword = maybeResolveSubalias(this.ambient, name)
		return keyword && (this.resolutions[name] = this.bindKeyword(keyword))
	}

	get ambient(): InternalModule {
		return $ark.ambient as never
	}

	private aliasOf(ctx: BaseParseContext): Alias.Node {
		const alias = this.node(
			"alias",
			{ reference: ctx.id },
			{ prereduced: true }
		)
		if (!ctx.closesCycle) alias.closesCycle = false
		return alias
	}

	private resolveContext(
		name: string,
		ctx: BaseParseContext,
		node: BaseRoot
	): BaseRoot {
		if (ctx.isReferencedById) {
			if (nodesByRegisteredId[node.id] !== node) node = withId(node, ctx.id)
			nodesByRegisteredId[ctx.id] = node
		} else delete nodesByRegisteredId[ctx.id]
		return (this.resolutions[name] = node)
	}

	private resolvePending(name: string, pending: BaseRoot): BaseRoot {
		if (inProgress.definitions && !isResolvable(pending))
			return this.node("alias", { reference: pending.id }, { prereduced: true })
		const ctx = nodesByRegisteredId[pending.id] as BaseParseContext
		const mark = $ark.reached?.mark()
		const resolution = resolving(() =>
			this.resolveContext(name, ctx, resolveShallowAliases(pending))
		)
		$ark.reached?.store(mark, this.resolutions, name)
		return resolution
	}

	maybeResolve(
		name: string
	): Exclude<CachedResolution, BaseParseContext> | undefined {
		const cached = this.resolutions[name]
		if (cached && !hasArkKind(cached, "context")) {
			$ark.reached?.cached(this.resolutions, name)
			if (hasArkKind(cached, "root") && cached.includesShallowAlias)
				return this.resolvePending(name, cached)
			return this.bindReference(cached)
		}
		const mark = $ark.reached?.mark()
		const resolution = this.resolveUncached(name, cached, mark)
		$ark.reached?.store(mark, this.resolutions, name)
		return resolution
	}

	private resolveUncached(
		name: string,
		cached: BaseParseContext | undefined,
		// how much was reached when resolving it began, which each member of a cycle it closes stores
		mark: number | undefined
	): Exclude<CachedResolution, BaseParseContext> | undefined {
		if (hasOwn(this.aliases, name)) $ark.reached?.alias(this, name)
		if (cached) {
			const v = cached
			if (v.phase === "resolving" || v.phase === "member") {
				reach(v)
				if (v.phase === "resolving") v.closesCycle = true
				return this.aliasOf(v)
			}
			if (v.phase === "failed") throw v.error
			if (v.phase === "resolved") {
				return throwInternalError(
					`Unexpected resolved context for was uncached by its scope: ${printable(v)}`
				)
			}
			registerParseContext(v).phase = "resolving"
			v.index = v.lowlink = openDefinitions.push(v) - 1
			const membersStart = openMembers.length
			let node: BaseRoot
			try {
				node = this.parseOpenDefinition(v.def, v)
			} catch (e) {
				// reset so the next reference reparses it and throws the same error
				v.phase = "unresolved"
				throw e
			} finally {
				openDefinitions.pop()
			}
			reach(v)
			if (v.lowlink < v.index && !node.includesShallowAlias) {
				v.phase = "member"
				v.resolution = node
				openMembers.push(v)
				return this.aliasOf(v)
			}
			v.phase = "resolved"
			const component = [v]
			try {
				return resolving(() => {
					// it reaches no definition still open, so its component closes with it
					if (v.lowlink === v.index) {
						for (const member of openMembers.splice(membersStart)) {
							component.push(member)
							member.phase = "resolved"
							member.$.resolveContext(member.alias!, member, member.resolution!)
							$ark.reached?.store(mark, member.$.resolutions, member.alias)
							delete member.resolution
						}
					}
					return node.includesShallowAlias ?
							this.resolvePending(
								name,
								(this.resolutions[name] = withId(node, v.id))
							)
						:	this.resolveContext(name, v, node)
				})
			} catch (e) {
				// a check deferred until its component closed failed, and reparsing would reuse the nodes it checked
				for (const ctx of component) {
					ctx.phase = "failed"
					ctx.error = e
					ctx.$.resolutions[ctx.alias!] = ctx
				}
				throw e
			}
		}
		const isScopeAlias = hasOwn(this.aliases, name)
		let def: unknown =
			isScopeAlias ? this.aliases[name]
			: hasOwn(this.ambient, name) ? this.ambient[name]
			: undefined

		if (!def) return this.maybeResolveSubalias(name)

		// a reference to a thunk's alias while it's called is a cycle, but a generic's declaration is called again
		if (isScopeAlias && isThunk(def) && !(def instanceof LazyGenericRoot)) {
			const preparsed = this.preparseOwnDefinitionFormat(def, { alias: name })
			const ctx = registerParseContext(
				this.createParseContext(preparsed as BaseParseContextInput)
			)
			this.resolutions[name] = ctx
			ctx.phase = "resolving"
			try {
				def = defining(() => this.normalizeRootScopeValue(ctx.def))
			} finally {
				// if the call throws, its context stays registered so an alias parsed during it resolves by name
				delete this.resolutions[name]
			}
			if (!hasArkKind(def, "generic") && !hasArkKind(def, "module")) {
				ctx.def = def
				ctx.phase = "unresolved"
				this.resolutions[name] = ctx
				// parsing its definition discards checks still open, so they're made first
				assertUnchecked()
				return this.maybeResolve(name)
			}
			delete nodesByRegisteredId[ctx.id]
		} else def = this.normalizeRootScopeValue(def)

		if (hasArkKind(def, "generic")) {
			const generic = (this.resolutions[name] = this.bindReference(def))
			generic.alias ??= name
			// instantiated once cached, so its errors surface here and its body can reference it
			try {
				void generic.baseInstantiation
			} catch (e) {
				delete this.resolutions[name]
				throw e
			}
			return generic
		}

		if (hasArkKind(def, "module")) {
			if (!def.root) throwParseError(writeMissingSubmoduleAccessMessage(name))
			return (this.resolutions[name] = this.finalize(
				isScopeAlias ? this.bindReference(def.root) : this.bindKeyword(def.root)
			))
		}

		return (this.resolutions[name] =
			isScopeAlias ?
				this.parse(def, { alias: name })
			:	this.finalize(this.bindKeyword(def as BaseRoot)))
	}

	protected createParseContext<input extends BaseParseContextInput>(
		input: input
	): input & AttachedParseContext {
		bootstrap()
		const ctx = input as input & AttachedParseContext
		ctx[arkKind] = "context"
		ctx.$ = this as never
		ctx.id = input.id ?? registerNodeId(input.prefix)
		ctx.phase = "unresolved"
		return ctx
	}

	traversal(root: unknown): Traversal {
		return new (rootApplyRuntimeOf(this.resolvedConfig).Traversal)(
			root,
			this.resolvedConfig
		)
	}

	import(): SchemaModule<{
		[k in exportedNameOf<$> as PrivateDeclaration<k>]: $[k]
	}>
	import<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<
		{
			[k in names[number] as PrivateDeclaration<k>]: $[k]
		} & unknown
	>
	import(...names: string[]): SchemaModule {
		return new RootModule(
			flatMorph(this.export(...(names as any)), (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

	compiledUnit: Fn | undefined

	get precompilation(): string | undefined {
		return this.compiledUnit?.toString()
	}

	private _exportedResolutions: InternalResolutions | undefined
	private _exports: RootExportCache | undefined
	export(): SchemaModule<{ [k in exportedNameOf<$>]: $[k] }>
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<
		{
			[k in names[number]]: $[k]
		} & unknown
	>
	export(...names: string[]): SchemaModule {
		if (!this._exports) {
			const mark = $ark.reached?.mark()
			// an alias resolving can export again, which returns what's exported so far
			this._exports = {}
			try {
				for (const name of this.exportedNames) {
					const def = this.aliases[name]
					this._exports[name] =
						this.lazyExports ? this.lazyExports[name]
						: hasArkKind(def, "module") ? bindModule(def, this)
						: this.maybeResolve(name)!
				}
			} catch (e) {
				// so a later call throws the same error
				this._exports = undefined
				throw e
			}

			this._exportedResolutions = resolutionsOfModule(this, this._exports)

			Object.assign(this.resolutions, this._exportedResolutions)

			if (!this.lazyExports) {
				const includesAlias = Object.values(this._exportedResolutions).some(
					resolution => isNode(resolution) && resolution.includesAlias
				)
				let uncompiled =
					includesAlias || bindPrecompiledUnits ? this.references : []
				if (bindPrecompiledUnits) {
					// a union compiles some branches inline, so no unit calls them and each binds on its own
					bindPrecompiledUnits(uncompiled)
					uncompiled = uncompiled.filter(node => !node.compiledUnit)
				}
				if (!this.resolvedConfig.jitless) {
					// resolving aliases can throw, so a scope including one compiles as it's exported
					if (uncompiled.some(node => node.includesAlias))
						this.compiledUnit = precompile(uncompiled, this)
					else {
						for (const name in this._exportedResolutions) {
							const resolution = this._exportedResolutions[name]
							if (hasArkKind(resolution, "root") && !resolution.compiledUnit)
								resolution.deferJit()
						}
					}
				}
				this.resolved = true
			}
			$ark.reached?.store(mark, this, "export")
		} else $ark.reached?.cached(this, "export")
		const namesToExport = names.length ? names : this.exportedNames
		return new RootModule(
			flatMorph(namesToExport, (_, name) => [
				name,
				this._exports![name]
			]) as never
		) as never
	}

	resolve<name extends exportedNameOf<$>>(
		name: name
	): instantiateRoot<$[name]> {
		return (this.lazyExports ?? this.export())[name as never]
	}

	private lazyExports: InternalModule | undefined

	exportLazily(): SchemaModule<{ [k in exportedNameOf<$>]: $[k] }> {
		if (!this.lazyExports) {
			const exports = new RootModule({})
			const resolve = (name: string) => {
				const def = this.aliases[name]
				return hasArkKind(def, "module") ?
						bindModuleLazily(def, this)
					:	finalizeExport(this, this.maybeResolve(name)!)
			}
			for (const name of this.exportedNames)
				defineLazily(exports, name, resolve)
			this.lazyExports = exports as never
			this.resolved = true
		}
		return this.lazyExports as never
	}

	node = <kind extends NodeKind, prereduced extends boolean = false>(
		kind: kind,
		input: NodeInput<kind>,
		opts = {} as BaseParseOptions<prereduced>
	): nodeOfKind<prereduced extends true ? kind : reducibleKindOf<kind>> => {
		if (isNode(input)) {
			return input.kind === kind ?
					(this.bindReference(input) as never)
				:	throwMismatchedNodeRootError(kind, input.kind)
		}

		if (kind === "union") {
			const union = input as Union.Inner
			const branches = union.branches.flatMap(branch =>
				(branch as BaseRoot).hasKind("union") ?
					(branch as {} as Union.Node).branches
				:	branch
			)
			// a union of one branch is that branch
			if (branches.length === 1) return this.bindReference(branches[0]) as never
			// a set engine rejects overlapping branches that transform differently
			if (
				!union.ordered &&
				!$ark.sets &&
				branches.length > 1 &&
				branches.some(branch => branch.includesTransform)
			)
				throwParseError(missingSetEngineMessage)
			input = { ...input, branches } as never
		}

		// -0 === 0, so a unit of either is the same type
		if (kind === "unit" && Object.is((input as Unit.Inner).unit, -0))
			input = { ...input, unit: 0 } as never

		bootstrap()
		return this.bindReference(
			parseNode({
				kind,
				def: input as NodeInput,
				$: this,
				id: opts.id ?? registerNodeId(opts.alias ?? kind),
				prereduced: opts.prereduced
			})
		) as never
	}

	parse = (def: unknown, opts: BaseParseOptions = {}): BaseRoot =>
		this.finalize(this.parseDefinition(def, opts))

	parseDefinition(def: unknown, opts: BaseParseOptions = {}): BaseRoot {
		if (hasArkKind(def, "root")) return this.bindReference(def)

		const ctxInputOrNode = this.preparseOwnDefinitionFormat(def, opts)
		if (hasArkKind(ctxInputOrNode, "root"))
			return this.bindReference(ctxInputOrNode)

		const ctx = registerParseContext(this.createParseContext(ctxInputOrNode))
		let node = this.parseOpenDefinition(def, ctx)
		node = resolving(() => {
			if (node.includesShallowAlias && !inProgress.definitions)
				node = resolveShallowAliases(node)

			// if the node is recursive e.g. { box: "this" }, we need to make sure it
			// has the original id from context so that its references compile correctly
			if (ctx.isReferencedById)
				nodesByRegisteredId[ctx.id] = node = withId(node, ctx.id)
			else delete nodesByRegisteredId[ctx.id]
			return node
		})
		if (!ctx.isReferencedAsThis || ctx.name) return node
		// parsed again, since the nodes that reference it have printed `this`
		return printSelfAsThis(
			this.parseDefinition(def, {
				...opts,
				name: `${ctx.prefix}${hashOf(node.expression)}`
			}),
			node
		)
	}

	openSynthetic(name: string | undefined): BaseParseContext {
		return registerParseContext(
			this.createParseContext({
				def: undefined,
				prefix: "synthetic",
				...(name && { name })
			})
		)
	}

	private parseOpenDefinition(def: unknown, ctx: BaseParseContext): BaseRoot {
		return defining(() =>
			this.bindReference(this.parseOwnDefinitionFormat(def, ctx))
		)
	}

	finalize<node extends BaseRoot>(node: node, jit = true): node {
		// an alias may reference a definition that is still being parsed,
		// e.g. Record<string, this>, so the outermost parse finalizes it
		if (
			(inProgress.definitions || inProgress.resolutions) &&
			node.includesAlias
		)
			return node

		// resolving aliases can throw, so a Type including one resolves and compiles them as it's defined
		const references =
			node.includesAlias ? referencesThroughAliases(node.references) : undefined
		if (node.compiledUnit || !jit) return node
		bindPrecompiledUnits?.([node])
		if (node.compiledUnit || this.resolvedConfig.jitless) return node
		if (references) precompileRoot(node, references)
		else node.deferJit()
		return node
	}

	jit(node: BaseNode): void {
		precompileRoot(node, node.references)
	}

	protected abstract preparseOwnDefinitionFormat(
		def: unknown,
		opts: BaseParseOptions
	): BaseRoot | BaseParseContextInput

	abstract parseOwnDefinitionFormat(
		def: unknown,
		ctx: BaseParseContext
	): BaseRoot

	protected abstract preparseOwnAliasEntry(k: string, v: unknown): AliasDefEntry

	protected abstract normalizeRootScopeValue(resolution: unknown): unknown
}

export class SchemaScope<$ extends {} = {}> extends BaseScope<$> {
	parseOwnDefinitionFormat(def: unknown, ctx: BaseParseContext): BaseRoot {
		return parseSchema(def, this, ctx.alias ? { alias: ctx.alias } : undefined)
	}

	protected preparseOwnDefinitionFormat(
		def: unknown,
		opts: BaseParseOptions
	): BaseRoot | BaseParseContextInput {
		return hasArkKind(def, "root") ? def : (
				{ ...opts, def, prefix: opts.alias ?? "schema" }
			)
	}

	protected preparseOwnAliasEntry(k: string, v: unknown): AliasDefEntry {
		return [k, v]
	}

	protected normalizeRootScopeValue(v: unknown): unknown {
		return v
	}
}

const bindModuleLazily = (
	module: InternalModule,
	$: BaseScope
): InternalModule => {
	const bound = new RootModule({})
	const resolve = (k: string) => {
		const resolution = module[k]
		return hasArkKind(resolution, "module") ?
				bindModuleLazily(resolution, $)
			:	finalizeExport($, $.bindReference(resolution as BaseRoot | GenericRoot))
	}
	for (const k in module) defineLazily(bound, k, resolve)
	return bound as never
}

export const finalizeExport = (
	$: BaseScope,
	resolution: BaseRoot | GenericRoot
): BaseRoot | GenericRoot =>
	hasArkKind(resolution, "root") ? $.finalize(resolution) : resolution

const openDefinitions: BaseParseContext[] = []
const openMembers: BaseParseContext[] = []

const reach = (ctx: BaseParseContext) => {
	const referencer = openDefinitions[openDefinitions.length - 1]
	if (referencer && ctx.lowlink! < referencer.lowlink!)
		referencer.lowlink = ctx.lowlink!
}

const maybeResolveExport = (
	exports: InternalModule,
	name: string
): BaseRoot | GenericRoot | undefined => {
	if (!name.includes(".")) return
	let resolution: unknown = exports
	for (const k of name.split(".")) {
		if (!hasArkKind(resolution, "module")) return
		resolution = (resolution as Dict)[k]
	}
	return hasArkKind(resolution, "root") || hasArkKind(resolution, "generic") ?
			resolution
		:	undefined
}

const addReferences = (
	base: BaseNode["referencesById"],
	references: BaseNode["referencesById"]
) => {
	for (const id in references) base[id] ??= references[id]
}

const resolutionsToJson = (resolutions: InternalResolutions): JsonStructure =>
	flatMorph(resolutions, (k, v) => [
		k,
		hasArkKind(v, "root") || hasArkKind(v, "generic") ? v.json
		: hasArkKind(v, "module") ? resolutionsToJson(v)
		: throwInternalError(`Unexpected resolution ${printable(v)}`)
	])

const maybeResolveSubalias = (
	base: Dict,
	name: string
): BaseRoot | GenericRoot | undefined => {
	const dotIndex = name.indexOf(".")
	if (dotIndex === -1) return

	const dotPrefix = name.slice(0, dotIndex)
	// if the name includes ".", but the prefix is not an alias, it
	// might be something like a decimal literal, so just fall through to return
	if (!hasOwn(base, dotPrefix)) return
	const prefixSchema = base[dotPrefix]
	if (!hasArkKind(prefixSchema, "module"))
		return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))

	const subalias = name.slice(dotIndex + 1)
	const resolution =
		hasOwn(prefixSchema, subalias) ? prefixSchema[subalias] : undefined

	if (resolution === undefined)
		return maybeResolveSubalias(prefixSchema, subalias)

	if (hasArkKind(resolution, "root") || hasArkKind(resolution, "generic"))
		return resolution

	if (hasArkKind(resolution, "module")) {
		return (
			resolution.root ??
			throwParseError(writeMissingSubmoduleAccessMessage(name))
		)
	}

	throwInternalError(
		`Unexpected resolution for alias '${name}': ${printable(resolution)}`
	)
}

type instantiateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends InternalResolution ? aliases[k]
	:	BaseRoot
} & unknown

export type SchemaScopeParser = <const aliases>(
	aliases: {
		[k in keyof aliases]: conform<
			aliases[k],
			RootSchema | PreparsedNodeResolution
		>
	},
	config?: ArkSchemaScopeConfig
) => BaseScope<instantiateAliases<aliases>>

export const schemaScope: SchemaScopeParser = (aliases, config) =>
	new SchemaScope(aliases, config)

export const rootSchemaScope: SchemaScope = new SchemaScope(
	{},
	{ name: "schema" },
	true
)

export const bootstrapRootScope = (): void => {
	// ensure the scope is resolved so JIT will be applied to future types
	rootSchemaScope.export()
}

export const parseAsSchema = (
	def: unknown,
	opts?: BaseParseOptions
): BaseRoot | ParseError => {
	try {
		return rootSchema(def as RootSchema, opts) as never
	} catch (e) {
		if (e instanceof ParseError) return e
		throw e
	}
}

export type RootExportCache = Record<
	string,
	BaseRoot | GenericRoot | RootModule | undefined
>

const resolutionsOfModule = ($: BaseScope, typeSet: RootExportCache) => {
	const result: InternalResolutions = {}
	for (const k in typeSet) {
		const v = typeSet[k]
		if (hasArkKind(v, "module")) {
			const innerResolutions = resolutionsOfModule($, v as never)
			const prefixedResolutions = flatMorph(
				innerResolutions,
				(innerK, innerV) => [`${k}.${innerK}`, innerV]
			)
			Object.assign(result, prefixedResolutions)
		} else if (hasArkKind(v, "root") || hasArkKind(v, "generic")) result[k] = v
		else throwInternalError(`Unexpected scope resolution ${printable(v)}`)
	}
	return result
}

export const writeUnresolvableMessage = <token extends string>(
	token: token
): writeUnresolvableMessage<token> => `'${token}' is unresolvable`

export type writeUnresolvableMessage<token extends string> =
	`'${token}' is unresolvable`

export const writeNonSubmoduleDotMessage = <name extends string>(
	name: name
): writeNonSubmoduleDotMessage<name> =>
	`'${name}' must reference a module to be accessed using dot syntax`

export type writeNonSubmoduleDotMessage<name extends string> =
	`'${name}' must reference a module to be accessed using dot syntax`

export const writeMissingSubmoduleAccessMessage = <name extends string>(
	name: name
): writeMissingSubmoduleAccessMessage<name> =>
	`Reference to submodule '${name}' must specify an alias`

export type writeMissingSubmoduleAccessMessage<name extends string> =
	`Reference to submodule '${name}' must specify an alias`

export const rootSchema: BaseScope["schema"] = rootSchemaScope.schema
export const node: BaseScope["node"] = rootSchemaScope.node
export const defineSchema: BaseScope["defineSchema"] =
	rootSchemaScope.defineSchema
export const genericNode: BaseScope["generic"] = rootSchemaScope.generic
