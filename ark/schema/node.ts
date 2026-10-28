import {
	Callable,
	DynamicFunction,
	append,
	appendUnique,
	arityOf,
	entriesOf,
	flatMorph,
	hasDomain,
	hashOf,
	includes,
	isArray,
	isEmptyObject,
	isKeyOf,
	liftArray,
	nameOf,
	printable,
	stringifyPath,
	throwError,
	throwInternalError,
	unset,
	type Dict,
	type Entry,
	type Fn,
	type GuardablePredicate,
	type Json,
	type JsonObject,
	type JsonStructure,
	type Key,
	type array,
	type conform,
	type dict,
	type listable,
	type mutable,
	type requireKeys
} from "@ark/util"
import type { ResolvedConfig } from "./config.ts"
import type {
	Inner,
	childKindOf,
	nodeOfKind,
	reducibleKindOf
} from "./kinds.ts"
import type { BaseParseContext, BaseParseOptions, NodeId } from "./parse.ts"
import type { AliasNode } from "./roots/alias.ts"
import type { Intersection } from "./roots/intersection.ts"
import type { Morph } from "./roots/morph.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { Unit } from "./roots/unit.ts"
import type { BaseScope } from "./scope.ts"
import { canJit, tryJit, type NodeCompiler } from "./shared/compile.ts"
import type {
	BaseNodeDeclaration,
	BaseNodeInput,
	TypeMeta,
	attachmentsOf
} from "./shared/declare.ts"
import { Disjoint } from "./shared/disjoint.ts"
import type { ArkErrors } from "./shared/errors.ts"
import {
	ArkErrors as BaseArkErrors,
	throwOnDefault,
	type FailureSite,
	type SiteContext,
	type UnionSite
} from "./shared/issues.ts"
import {
	basisKinds,
	defaultValueSerializer,
	metaJsonOf,
	precedenceOfKind,
	rootKinds,
	structuralKinds,
	type BasisKind,
	type NodeKind,
	type OpenNodeKind,
	type StructuralKind,
	type UnknownAttachments,
	type UnknownAttachmentsInput
} from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import {
	rootApplyParams,
	rootApplyRuntime,
	writeRootApply,
	type RootApplyRuntime
} from "./shared/rootApply.ts"
import {
	addErrors,
	allowsAcyclic,
	allowsInContext,
	allowsUntracked,
	pipe,
	transform,
	transformResolution,
	type AliasDepth,
	type FailHandler,
	type InternalTraversal,
	type Traversal,
	type TraverseApply,
	type TraverseTransform
} from "./shared/traversal.ts"
import {
	composing,
	hasArkKind,
	inProgress,
	isIoFinal,
	isNode,
	isResolutionFinal,
	printSelfAsThis
} from "./shared/utils.ts"
import type { Sequence } from "./structure/sequence.ts"
import type { UndeclaredKeyHandling } from "./structure/structure.ts"
import type { UnboundTraversals } from "./units.ts"

const noReferences: readonly BaseNode[] = []

interface Selections {
	// null where a node's selection is read from its refsById
	byNode: WeakMap<BaseNode, readonly BaseNode[] | null>
	byRefs: WeakMap<object, readonly BaseNode[]>
}

const selectionsByPredicate = new Map<Fn, Selections>()

export const forgetReferences = (node: BaseNode): void => {
	for (const { byNode, byRefs } of selectionsByPredicate.values()) {
		byNode.delete(node)
		if (node.c.byId) byRefs.delete(node.c.byId)
	}
}

const selectedFrom = (
	node: BaseNode,
	selects: (node: BaseNode) => boolean,
	referenced: readonly BaseNode[],
	byNode: Selections["byNode"]
): readonly BaseNode[] | null => {
	let selected: readonly BaseNode[] = selects(node) ? [node] : noReferences
	let merged: Set<BaseNode> | undefined
	for (const reference of referenced) {
		const fromReference = byNode.get(reference)
		if (fromReference === null) return null
		if (!fromReference!.length || fromReference === selected) continue
		if (!selected.length) {
			selected = fromReference!
			continue
		}
		if (!merged) {
			merged = new Set(selected)
			selected = [...selected]
		}
		for (const node of fromReference!) {
			if (merged.has(node)) continue
			merged.add(node)
			;(selected as BaseNode[]).push(node)
		}
	}
	return selected
}

class NodeCache {
	expression: string | undefined
	requiredProps: Map<Key, { deref(): BaseNode | undefined }> | undefined
	kv: readonly Entry<string>[] | undefined
	metaJson: object | undefined
	byId: Record<string, BaseNode> | undefined
	/** whether collecting its references replaced one with an equal node */
	replacedRefs: boolean | undefined
	shallowRefs: BaseNode[] | undefined
	flatRefs: FlatRef[] | undefined
	fullJson: JsonObject | undefined
	innerJson: JsonStructure | undefined
	json: JsonStructure | undefined
	bareJson: Json | undefined
	innerHash: string | undefined
	hash: string | undefined
	flatMorphs: FlatRef<Morph.Node | Intersection.Node>[] | undefined
	entersAlias: boolean | undefined
	trackedId: string | undefined
	tfs: boolean | undefined
	checksCtx: boolean | undefined
	/** whether it was used before it was compiled, so it's compiled at its next use */
	usedPreJit: boolean | undefined
	failSite: FailureSite | UnionSite | undefined
	finalizedIn: unknown
	_in: BaseNode | undefined
	finalizedOut: unknown
	_out: BaseNode | undefined
	assert: ((data: any, pipedFromCtx?: Traversal) => unknown) | undefined
	pipe: BaseRoot["pipe"] | undefined
	description: string | undefined
	// resolved by an alias's thunk, which doesn't register its id
	isAliasResolution: boolean | undefined
	/** the `allows` a Type has while it defers compiling until it's used */
	preJit: BaseNode["allows"] | undefined
	isReusableLeaf: boolean | undefined
	declare onFail: ArkErrors.Handler | null
	declare rootApply?: RootApply
	declare applyInPlace?: TraverseApply
	declare transformInPlace?: TraverseTransform
	declare unbound?: UnboundTraversals | undefined
}

// outside the getter, so reading it allocates no context for `this`
const assertOf =
	(node: BaseNode) =>
	(data: unknown, pipedFromCtx?: Traversal): unknown =>
		node(data, pipedFromCtx, throwOnDefault)

// long hashes mostly serve parsing, so they're dropped once the job that wrote them ends
let hashedInJob: NodeCache[] = []

const keptForJob = (cache: NodeCache, hash: string): string => {
	if (hash.length > 256 && hashedInJob.push(cache) === 1) {
		void Promise.resolve().then(() => {
			for (const cache of hashedInJob) cache.innerHash = cache.hash = undefined
			hashedInJob = []
		})
	}
	return hash
}

// past this length, a hash is a prefix of the JSON, by which siblings still sort, and a digest
const maxPlainHashLength = 65_536
export const hashedPrefixLength = 1024
// a digest reads an object nested past this length as that object's digest
const maxInlinedLength = 256

const hashJsonOf = (json: object): string =>
	jsonLengthOf(json) <= maxPlainHashLength ?
		JSON.stringify(json)
	:	`${jsonPrefixOf(json, hashedPrefixLength)}#${digestOf(json)}`

const jsonLengths = new WeakMap<object, number>()

// approximate, memoized per object
export const jsonLengthOf = (json: unknown): number => {
	if (typeof json !== "object" || json === null)
		return typeof json === "string" ? json.length + 2 : 5
	let length = jsonLengths.get(json)
	if (length !== undefined) return length
	length = 2
	let nests = false
	for (const k in json) {
		const v = (json as Dict)[k]
		if (typeof v === "object" && v !== null) nests = true
		length += k.length + 4 + jsonLengthOf(v)
	}
	if (nests) jsonLengths.set(json, length)
	return length
}

const isUnwritten = (v: unknown) =>
	v === undefined || typeof v === "function" || typeof v === "symbol"

const jsonPrefixOf = (json: unknown, max: number): string => {
	if (max <= 0) return ""
	if (typeof json !== "object" || json === null)
		return JSON.stringify(json).slice(0, max)
	const array = isArray(json)
	let prefix = array ? "[" : "{"
	for (const k of Object.keys(json)) {
		if (prefix.length >= max) return prefix.slice(0, max)
		const v = (json as Dict)[k]
		if (!array && isUnwritten(v)) continue
		if (prefix.length > 1) prefix += ","
		if (!array) prefix += `${JSON.stringify(k)}:`
		prefix += isUnwritten(v) ? "null" : jsonPrefixOf(v, max - prefix.length)
	}
	return `${prefix}${array ? "]" : "}"}`.slice(0, max)
}

const digests = new WeakMap<object, string>()

// a nested object past maxInlinedLength is written as "#" and its digest
const digestOf = (json: object): string => {
	let digest = digests.get(json)
	if (digest === undefined) {
		const array = isArray(json)
		const entries: string[] = []
		for (const k of Object.keys(json)) {
			const v = (json as Dict)[k]
			const written =
				(
					typeof v === "object" &&
					v !== null &&
					jsonLengthOf(v) > maxInlinedLength
				) ?
					`#${digestOf(v)}`
				:	(JSON.stringify(v) as string | undefined)
			if (array) entries.push(written ?? "null")
			else if (written !== undefined)
				entries.push(`${JSON.stringify(k)}:${written}`)
		}
		digest = hashOf(array ? `[${entries.join()}]` : `{${entries.join()}}`)
		digests.set(json, digest)
	}
	return digest
}

// digests can collide, so hashes ending in one are confirmed by their JSON
export const hashesMatch = (l: BaseNode, r: BaseNode): boolean =>
	l.hash === r.hash && (l.hash.endsWith("}") || isJsonEqual(l.json, r.json))

export const innerHashesMatch = (l: BaseNode, r: BaseNode): boolean =>
	l.innerHash === r.innerHash &&
	(l.innerHash.endsWith("}") || isJsonEqual(l.innerJson, r.innerJson))

const equalJson = new WeakMap<object, WeakSet<object>>()

const isJsonEqual = (l: unknown, r: unknown): boolean => {
	if (l === r) return true
	const isObject = typeof l === "object" && l !== null
	if (isObject !== (typeof r === "object" && r !== null)) return false
	if (!isObject) return JSON.stringify(l) === JSON.stringify(r)
	if (equalJson.get(l)?.has(r as object)) return true
	const array = isArray(l)
	if (array !== isArray(r)) return false
	const lKeys = writtenKeysOf(l, array)
	const rKeys = writtenKeysOf(r as object, array)
	if (lKeys.length !== rKeys.length) return false
	for (let i = 0; i < lKeys.length; i++) {
		const k = lKeys[i]
		if (k !== rKeys[i]) return false
		const lValue = (l as Dict)[k]
		const rValue = (r as Dict)[k]
		// an array writes these as null
		if (
			!(array && isUnwritten(lValue) ? isUnwritten(rValue) || rValue === null
			: array && isUnwritten(rValue) ? lValue === null
			: isJsonEqual(lValue, rValue))
		)
			return false
	}
	const equal = equalJson.get(l)
	if (equal) equal.add(r as object)
	else equalJson.set(l, new WeakSet([r as object]))
	return true
}

const writtenKeysOf = (json: object, array: boolean): string[] =>
	array ?
		Object.keys(json)
	:	Object.keys(json).filter(k => !isUnwritten((json as Dict)[k]))

export abstract class BaseNode<
	// uses -ignore rather than -expect-error because this is not an error in .d.ts
	/** @ts-ignore allow instantiation assignment to the base type */
	out d extends BaseNodeDeclaration = BaseNodeDeclaration
> extends Callable<
	(
		data: d["prerequisite"],
		ctx?: Traversal,
		onFail?: ArkErrors.Handler | null
	) => unknown,
	attachmentsOf<d>
> {
	declare $: BaseScope
	declare bits: number
	/** whether it or a node it holds alters data, with a morph or a default */
	declare alters: boolean
	/** whether it or a node it holds is a morph */
	declare hasMorph: boolean
	/** whether it or a node it holds has a narrow that reads `ctx` */
	declare ctxPred: boolean
	declare isCyclic: boolean
	/** whether it or a node it holds is an alias */
	declare hasAlias: boolean
	/** whether it is an alias, or a union or morph whose own data an alias checks */
	declare topAlias: boolean
	/** whether its Allows needs `ctx`, so it can't be called with data alone */
	declare allowsCtx: boolean
	/** whether it or a node it holds has a morph that reads `ctx` or pipes to a node */
	declare ctxMorph: boolean
	/** whether it or a node it holds keeps the description it had in its original scope */
	declare keptDesc: boolean
	/** whether it or a node it holds calls a morph or a narrow other than a keyword's */
	declare userCode: boolean
	/** whether it or a node it holds loops or runs a regex, as a sequence or a pattern does */
	declare costly: boolean
	/** its cache: what's derived from it, each computed when first read */
	declare readonly c: NodeCache

	declare allows: (data: d["prerequisite"]) => boolean

	/** the morphs its own data passes through, not a prop's */
	get topMorphs(): array<Morph> {
		return []
	}

	/** its inner keys and values, as entries */
	get kv(): readonly Entry<string>[] {
		return (this.c.kv ??= entriesOf(this.inner) as never)
	}

	get metaJson(): object {
		return (this.c.metaJson ??= metaJsonOf(this.meta))
	}

	get onFail(): ArkErrors.Handler | null {
		return this.c.onFail
	}

	constructor(attachments: UnknownAttachmentsInput, $: BaseScope) {
		const cache = new NodeCache()
		cache.metaJson = attachments.metaJson
		cache.onFail = attachments.meta.onFail ?? $.cfg.onFail
		super(
			(
				data: any,
				pipedFromCtx?: Traversal | undefined,
				onFail?: ArkErrors.Handler | null
			) => {
				if (pipedFromCtx) return pipe(pipedFromCtx, this, data)

				const rootApply = cache.rootApply
				return rootApply === undefined ?
						this.initRootApply()(data, onFail)
					:	rootApply(data, onFail)
			},
			{ bind: null }
		)
		if (attachments.kind !== "intersection") {
			for (const k in attachments.impl.keys) {
				// only a prop with a default has the key
				if (k !== "default" || "default" in attachments.inner)
					(this as {} as dict)[k] = attachments.inner[k]
			}
		}
		this.c = cache
		const self: mutable<UnknownAttachments> = this
		self.id = attachments.id
		self.kind = attachments.kind
		self.impl = attachments.impl
		self.inner = attachments.inner
		self.meta = attachments.meta
		self.children = attachments.children
		this.$ = $
		// own, so jit can replace them
		const { tAllows, tApply, tTransform } = this
		this.tAllows = tAllows
		this.tApply = tApply
		if (tTransform) this.tTransform = tTransform

		let bits = 0
		if (this.is("morph")) {
			bits = flagBits.hasMorph | flagBits.alters | flagBits.userCode
			// a node first is its input, not one it pipes to
			if (
				this.inner.morphs.some((morph, i) =>
					isNode(morph) ? i !== 0 : arityOf(morph) !== 1
				)
			)
				bits |= flagBits.ctxMorph
		} else if (this.is("sequence")) {
			if (this.inner.defaultables !== undefined) bits = flagBits.alters
		} else if (this.is("predicate")) {
			if (this.meta.keyword === undefined) bits = flagBits.userCode
			// if a predicate accepts exactly one arg, we can safely skip passing context
			// technically, a predicate could be written like `(data, ...[ctx]) => ctx.mustBe("malicious")`
			// that would break here, but it feels like a pathological case and is better to let people optimize
			if (arityOf(this.inner.predicate) !== 1) bits |= flagBits.ctxPred
		} else if (this.is("alias"))
			bits = flagBits.isCyclic | flagBits.hasAlias | flagBits.topAlias

		// an alias belongs in a structural value, so one there doesn't make its parent shallow
		const inherited = this.isStructural() ? ~flagBits.topAlias : ~0
		for (let i = 0; i < this.children.length; i++)
			bits |= this.children[i].bits & inherited
		if (bits & (flagBits.ctxPred | flagBits.isCyclic))
			bits |= flagBits.allowsCtx
		this.bits = bits

		this.allows =
			this.allowsCtx ?
				data =>
					allowsUntracked(this, data) ?? allowsInContext(this, data, this.$.cfg)
			:	data => (this.tAllows as any)(data)
	}

	get entersAlias(): boolean {
		if (this.c.entersAlias !== undefined) return this.c.entersAlias
		const entersAlias =
			this.isCyclic &&
			(this.c.isAliasResolution ||
				isNode($ark.nodesById[this.id]) ||
				(this.is("intersection") && !!this.structure?.props.length))
		return isResolutionFinal() ?
				(this.c.entersAlias = entersAlias)
			:	entersAlias
	}

	// a root no alias references is tracked as an equal resolution
	get trackedId(): string {
		if (this.c.trackedId) return this.c.trackedId
		if (!isResolutionFinal()) return this.id
		if (this.is("alias") || isNode($ark.nodesById[this.id]))
			return (this.c.trackedId = this.id)
		const alias = referencesThroughAliases(this.references).find(
			reference =>
				reference.is("alias") &&
				reference.resolution.kind === this.kind &&
				_isMutuallySimulated(this, reference.resolution, {
					unfoldsAliases: true,
					subsumes: false
				})
		) as AliasNode | undefined
		return (this.c.trackedId = alias ? alias.resolution.id : this.id)
	}

	/**
	 * whether it alters data, counting what it reaches through aliases, which
	 * `alters` doesn't see; final once nothing but inputs and outputs is open
	 */
	get tfs(): boolean {
		if (this.c.tfs !== undefined) return this.c.tfs
		const tfs = this.reaches("alters")
		return isIoFinal() ? (this.c.tfs = tfs) : tfs
	}

	/** whether checking data reaches a narrow that reads `ctx`, through aliases too, so Allows needs a traversal */
	get checksCtx(): boolean {
		if (this.c.checksCtx !== undefined) return this.c.checksCtx
		const requiresTraversal = this.reaches("ctxPred")
		return isIoFinal() ?
				(this.c.checksCtx = requiresTraversal)
			:	requiresTraversal
	}

	private reaches(
		flag: "alters" | "ctxPred",
		resolvesIntersections = false
	): boolean {
		if (this[flag] || !this.hasAlias) return this[flag]
		const cached = flag === "alters" ? "tfs" : "checksCtx"
		let reachesOperands = false
		// a Map visits the ids added while it's iterated
		const reached = new Map<string, BaseNode>([[this.id, this]])
		for (const node of reached.values()) {
			for (const id in node.byId) {
				const reference = node.byId[id]
				// an intersection can drop what its operands reach, so only resolving it decides
				if (reference[flag]) return !reachesOperands || this.reaches(flag, true)
				if (!reference.is("alias")) continue
				// resolving an intersection can create others or reenter an operand still resolving
				if (
					reference.operator === "&" &&
					!(resolvesIntersections && reference.hasResolvableOperands)
				) {
					reachesOperands ||= !resolvesIntersections
					for (const operand of reference.operands!)
						reached.set(operand.id, operand)
					continue
				}
				const registered = $ark.nodesById[reference.reference as NodeId]
				const resolution =
					isNode(registered) ? registered
					: !reference.isIo ? reference.resolution
					: flag !== "alters" ? (reference.operands![0] as AliasNode).resolution
					: undefined
				if (resolution && resolution.c[cached] !== false)
					reached.set(resolution.id, resolution)
			}
		}
		// a node this reaches reaches nothing this doesn't
		if (isIoFinal()) for (const node of reached.values()) node.c[cached] = false
		return false
	}

	// entered directly, it keys its output by id as an alias resolving to it does
	get tfsById(): boolean {
		return this.hasAlias && $ark.nodesById[this.id] !== undefined
	}

	/** whether transforming data needs `ctx`: a morph reading it, an alias, or a `ctx` narrow choosing a branch */
	get tfCtx(): boolean {
		return (
			this.tfs &&
			(this.ctxMorph || this.hasAlias || (this.ctxPred && this.ctxSel))
		)
	}

	/** whether a child's transform needs `ctx`, so a `ctx` narrow choosing between children does too */
	protected get ctxSel(): boolean {
		return this.children.some(child => child.tfCtx)
	}

	/** how its root apply validates: by Allows alone, with a traversal, or transforming with or without `ctx` */
	get applyMode(): RootApplyStrategy {
		return (
			this.tfs ?
				this.tfCtx ?
					"contextualTransform"
				:	"transform"
			: this.checksCtx ? "contextual"
			: "allows"
		)
	}

	/** each node it references, keyed by id */
	get byId(): Record<string, BaseNode> {
		return (this.c.byId ??= this.collectReferences())
	}

	selectReferences(selects: (node: BaseNode) => boolean): readonly BaseNode[] {
		let selections = selectionsByPredicate.get(selects)
		if (!selections) {
			selectionsByPredicate.set(
				selects,
				(selections = { byNode: new WeakMap(), byRefs: new WeakMap() })
			)
		}
		const { byNode, byRefs } = selections
		const entered = new Set<BaseNode>()
		const stack: BaseNode[] = [this]
		while (stack.length) {
			const node = stack[stack.length - 1]
			if (byNode.has(node)) {
				stack.pop()
				continue
			}
			// an alias can close a cycle or replace a node sharing its id
			if (node.hasAlias) {
				byNode.set(node, null)
				stack.pop()
				continue
			}
			const referenced = [...node.children, ...node.otherRefs]
			const pending = referenced.filter(reference => !byNode.has(reference))
			if (pending.length) {
				// entered again before its references are read: a cycle
				if (entered.has(node)) {
					byNode.set(node, null)
					stack.pop()
				} else {
					entered.add(node)
					stack.push(...pending)
				}
				continue
			}
			stack.pop()
			byNode.set(node, selectedFrom(node, selects, referenced, byNode))
		}
		const selected = byNode.get(this)
		if (selected) return selected
		const byId = this.byId
		let fromRefs = byRefs.get(byId)
		if (!fromRefs) {
			fromRefs = Object.values(byId).filter(selects)
			byRefs.set(byId, fromRefs)
		}
		return fromRefs
	}

	/** the nodes it references that aren't its children, like the node a morph pipes to */
	get otherRefs(): readonly BaseNode[] {
		return noReferences
	}

	private collectReferences(): Record<string, BaseNode> {
		const collected = new Map<string, BaseNode>()
		let replaced = false
		const include = (node: BaseNode): void => {
			if (replaced || node.c.byId) {
				const references = node.byId
				if (node.c.replacedRefs) replaced = true
				for (const id in references) {
					const included = collected.get(id)
					if (included !== undefined && included !== references[id])
						replaced = true
					collected.set(id, references[id])
				}
				return
			}
			const included = collected.get(node.id)
			if (included === node) return
			if (included !== undefined) replaced = true
			collected.set(node.id, node)
			for (let i = 0; i < node.children.length; i++) include(node.children[i])
			for (const referenced of node.otherRefs) include(referenced)
		}
		include(this)
		this.c.replacedRefs = replaced
		return Object.fromEntries(collected)
	}

	get shallowRefs(): BaseNode[] {
		return (this.c.shallowRefs ??=
			this.is("structure") ?
				[this as BaseNode, ...(this.children as never)]
			:	this.children.reduce<BaseNode[]>(
					(acc, child) => appendUniqueNodes(acc, child.shallowRefs),
					[this]
				))
	}

	get flatRefs(): FlatRef[] {
		if (!this.c.flatRefs) this.initFlat()
		return this.c.flatRefs!
	}

	get flatMorphs(): FlatRef<Morph.Node | Intersection.Node>[] {
		if (!this.c.flatMorphs) this.initFlat()
		return this.c.flatMorphs!
	}

	/** collects its flat references and flat morphs */
	protected initFlat(): void {
		const flatRefs = uniqueFlatRefs(
			this.children.flatMap(child => child.flatRefs)
		)
		const flatMorphs: FlatRef<Morph.Node | Intersection.Node>[] = []
		for (const ref of flatRefs) {
			for (const branch of ref.node.branches) {
				if (
					branch.is("morph") ||
					(branch.is("intersection") &&
						branch.structure?.structMorph !== undefined)
				) {
					flatMorphs.push({
						path: ref.path,
						propString: ref.propString,
						node: branch
					})
				}
			}
		}

		this.c.flatRefs = flatRefs.sort((l, r) =>
			l.path.length > r.path.length ? 1
			: l.path.length < r.path.length ? -1
			: l.propString > r.propString ? 1
			: l.propString < r.propString ? -1
			: l.node.expression < r.node.expression ? -1
			: l.node.expression > r.node.expression ? 1
			: 0
		)
		this.c.flatMorphs = flatMorphs
	}

	// a Type without contextual callbacks checks its first data uncompiled
	private get checksUncompiled(): boolean {
		return (
			!this.ctxPred &&
			!this.ctxMorph &&
			($ark.inPlace?.checksUncompiled(this as never) ?? !this.c.usedPreJit)
		)
	}

	deferJit(): void {
		if (this.c.preJit) return
		const allows = (this.c.preJit = this.allows)
		// keeps what compiled, as a detached reference can call this after
		let compiled: BaseNode["allows"] | undefined
		this.allows = data => {
			if (compiled !== undefined) return compiled(data)
			if (this.c.preJit) {
				if (this.checksUncompiled) {
					this.c.usedPreJit = true
					return allows(data)
				}
				this.$.jit(this)
			}
			return (compiled = this.allows)(data)
		}
	}

	private initRootApply(): RootApply {
		if (this.c.preJit) {
			if (this.checksUncompiled) {
				const rootApply = this.createRootApply()
				// marked used once it returns, so an allows it calls doesn't compile
				const apply: RootApply = (data, onFail) => {
					const result = rootApply(data, onFail)
					this.c.usedPreJit = true
					return result
				}
				const checked =
					$ark.inPlace ?
						$ark.inPlace.checkedUncompiled(this as never, apply)
					:	apply
				if (checked) return checked
			}
			this.$.jit(this)
		}
		return (this.c.rootApply =
			(this.unitFn &&
				this.isRoot() &&
				canJit(this.$.cfg) &&
				tryJit(() =>
					compileRootApply($ark.inPlace?.applied(this as never) ?? this)
				)) ||
			this.createRootApply())
	}

	protected createRootApply(): RootApply {
		const byErrors = rootApplyRuntimeOf(this.$.cfg)
		const runtime = $ark.inPlace?.runtimeOf(this as never, byErrors) ?? byErrors
		const { Traversal } = runtime
		switch (this.applyMode) {
			case "allows":
				return (data, onFail = this.onFail) => {
					if (this.allows(data)) return data

					return this.rejectRoot(data, onFail, runtime)
				}

			case "contextual":
				return (data, onFail = this.onFail) => {
					if (allowsInContext(this, data, this.$.cfg)) return data

					return this.rejectRoot(data, onFail, runtime)
				}

			case "transform":
			case "contextualTransform":
				if (this.hasAlias) {
					return (data, onFail = this.onFail) => {
						const untracked = allowsAcyclic(this, data)
						const allowed = untracked ?? allowsInContext(this, data, this.$.cfg)
						if (!allowed) return this.rejectRoot(data, onFail, runtime)
						const ctx = new Traversal(data, this.$.cfg)
						ctx.isTree = untracked === undefined
						const result = transformResolution(
							ctx,
							this.id,
							data,
							this.tTransform!,
							this
						)
						return ctx.hasError() ? ctx.fin(onFail) : result
					}
				}
				if (!this.tfCtx) {
					if (
						(this as {} as BaseRoot).branches.every(
							branch => !branch.tfs || (branch.is("morph") && !branch.head?.tfs)
						)
					)
						return this.optimisticApply(runtime)
					if (this.is("union") && !this.discriminant) {
						return (data, onFail = this.onFail) => {
							const ctx = new Traversal(data, this.$.cfg)
							const result = transform(ctx, this, data)
							if (result === unset)
								return this.rejectRoot(data, onFail, runtime)
							return ctx.hasError() ? ctx.fin(onFail) : result
						}
					}
				}
				return (data, onFail = this.onFail) => {
					if (!this.allows(data)) return this.rejectRoot(data, onFail, runtime)
					const ctx = new Traversal(data, this.$.cfg)
					const result = transform(ctx, this, data)
					return ctx.hasError() ? ctx.fin(onFail) : result
				}
			default:
				this.applyMode satisfies never
				return throwInternalError(`Unexpected applyMode ${this.applyMode}`)
		}
	}

	/**
	 * a root apply transforming by the first branch allowing data, with no
	 * `ctx`, since a transform that doesn't need one has only context-free morphs
	 */
	private optimisticApply(runtime: RootApplyRuntime): RootApply {
		const { Traversal } = runtime
		const branches = (this as {} as BaseRoot).branches
		return (data, onFail = this.onFail) => {
			for (let i = 0; i < branches.length; i++) {
				const branch = branches[i]
				if (!branch.allows(data)) continue
				if (!branch.is("morph")) return data
				let result = data
				for (let j = 0; j < branch.piped.length; j++) {
					// called detached, as compiled code calls it
					const morph = branch.piped[j] as Morph.ContextFree
					const morphed = morph(result as never)
					if (morphed instanceof BaseArkErrors) {
						const ctx = new Traversal(data, this.$.cfg)
						addErrors(ctx, morphed)
						return ctx.fin(onFail)
					}
					result = morphed
				}
				return result
			}
			return this.rejectRoot(data, onFail, runtime)
		}
	}

	private rejectRoot(
		data: unknown,
		onFail: FailHandler | null,
		{ Traversal, applyCyclic, applyRejected }: RootApplyRuntime
	): unknown {
		const config = this.$.cfg
		return this.hasAlias ?
				applyCyclic(this, data, new Traversal(data, config)).fin(onFail)
			:	applyRejected(this, data, config, onFail, Traversal)
	}

	/** checks data without collecting errors, `t` and a traversal kind naming each traversal */
	abstract tAllows(
		data: d["prerequisite"],
		ctx: InternalTraversal | AliasDepth
	): boolean
	/** checks data, collecting its errors in `ctx`, and applies its morphs */
	abstract tApply(data: d["prerequisite"], ctx: InternalTraversal): void
	/** applies its morphs and defaults to data already found valid */
	tTransform?(data: d["prerequisite"], ctx: InternalTraversal): unknown

	abstract expression: string
	abstract compile(js: NodeCompiler): void
	/** writes one expression for whether `data` satisfies it, for a leaf checked inline, if it can */
	jsCond?(js: NodeCompiler, data: string): string | undefined
	/** writes one expression computing its traversal's result, if it can */
	jsExpression?(js: NodeCompiler): string | undefined

	/** what compiled code reports when data fails it, holding its `errorCtx` as `v` */
	get failSite(): FailureSite | UnionSite {
		return (this.c.failSite ??= {
			v: (this as never as { errorCtx: SiteContext }).errorCtx
		})
	}

	get description(): string {
		return (this.c.description ??=
			this.meta?.description ??
			composing(() => this.$.cfg[this.kind].description(this as never)))
	}

	// we don't cache this currently since it can be updated once a scope finishes
	// resolving cyclic references, although it may be possible to ensure it is cached safely
	get references(): BaseNode[] {
		return Object.values(this.byId)
	}

	get precedence(): number {
		return precedenceOfKind(this.kind)
	}

	/** its precompiled unit's function, whose source is its `precompilation` */
	unitFn: Fn | undefined

	get precompilation(): string | undefined {
		if (this.c.preJit) this.$.jit(this)
		return this.unitFn?.toString()
	}

	// an arrow, since it is often detached, e.g. when passed to tRPC
	get assert(): (data: d["prerequisite"], pipedFromCtx?: Traversal) => unknown {
		return (this.c.assert ??= assertOf(this))
	}

	traverse(
		data: d["prerequisite"],
		pipedFromCtx?: Traversal
	): ArkErrors | {} | null | undefined {
		return this(data, pipedFromCtx, null)
	}

	// checks data without marking the Type used, e.g. a default
	traverseUnused(data: d["prerequisite"]): ArkErrors | {} | null | undefined {
		const usedPreJit = this.c.usedPreJit
		const out = this.traverse(data)
		this.c.usedPreJit = usedPreJit
		return out
	}

	// allows data without marking the Type used, e.g. a key an intersection checks
	allowsUnused(data: d["prerequisite"]): boolean {
		const usedPreJit = this.c.usedPreJit
		const out = this.allows(data)
		this.c.usedPreJit = usedPreJit
		return out
	}

	/** _in should be used internally instead */
	get in(): unknown {
		// ensure the node has been finalized if in is being used externally
		return (this.c.finalizedIn ??= this.finalized(this._in))
	}

	/** the input it accepts as a node, each morph replaced by its input: what `in` finalizes */
	get _in(): BaseNode {
		return this.c._in ?? this.cachedIo("in")
	}

	/** _out should be used internally instead */
	get out(): unknown {
		// ensure the node has been finalized if out is being used externally
		return (this.c.finalizedOut ??= this.finalized(this._out))
	}

	/** the output it returns as a node, each morph replaced by its output: what `out` finalizes */
	get _out(): BaseNode {
		return this.c._out ?? this.cachedIo("out")
	}

	private finalized(io: BaseNode): BaseNode {
		return io.isRoot() ? this.$.fin(io) : io
	}

	// an open alias's io isn't final, so it isn't cached
	private cachedIo(ioKind: "in" | "out"): BaseNode {
		const io = this.getIo(ioKind)
		if (!this.hasAlias || isIoFinal())
			this.c[ioKind === "in" ? "_in" : "_out"] = io
		return io
	}

	// Should be refactored to use transform
	// https://github.com/arktypeio/arktype/issues/1020
	getIo(ioKind: "in" | "out"): BaseNode {
		if (!this.alters && !(isIoFinal() && this.tfs)) return this as never

		const ioInner: Record<any, unknown> = {}
		for (const [k, v] of this.kv) {
			const keySchemaImplementation = this.impl.keys[k]

			if (keySchemaImplementation.reduceIo)
				keySchemaImplementation.reduceIo(ioKind, ioInner, v)
			else if (keySchemaImplementation.child) {
				const childValue = v as listable<BaseNode>

				ioInner[k] =
					isArray(childValue) ?
						childValue.map(child => ioOf(child, ioKind))
					:	ioOf(childValue, ioKind)
			} else ioInner[k] = v
		}

		// an open alias stands for its input and output alike, so the union reduces once final
		return this.$.node(this.kind, ioInner as never, {
			reduced: this.is("union") && this.hasAlias && !isIoFinal()
		})
	}

	get innerJson(): JsonStructure {
		return (this.c.innerJson ??= possiblyCollapse(
			this.fullJson,
			this.impl.bareKey,
			false
		))
	}

	get json(): JsonStructure {
		return (this.c.json ??=
			isEmptyObject(this.meta) ?
				this.innerJson
			:	possiblyCollapse(
					{
						...this.fullJson,
						meta: possiblyCollapse(
							this.metaJson as JsonObject,
							"description",
							true
						)
					},
					this.impl.bareKey,
					false
				))
	}

	/** its json, or the value of its `bareKey` alone where that's all it holds */
	get bareJson(): Json {
		return (this.c.bareJson ??= possiblyCollapse(
			this.json as JsonObject,
			this.impl.bareKey,
			true
		))
	}

	get innerHash(): string {
		return (this.c.innerHash ??= keptForJob(
			this.c,
			hashJsonOf({ kind: this.kind, ...this.innerJson })
		))
	}

	get hash(): string {
		return (this.c.hash ??=
			isEmptyObject(this.meta) ?
				this.innerHash
			:	keptForJob(this.c, hashJsonOf({ kind: this.kind, ...this.json })))
	}

	/** its inner JSON before collapsing, with every key it has */
	protected get fullJson(): JsonObject {
		return (this.c.fullJson ??= writeInnerJson(this))
	}

	toJSON(): JsonStructure {
		return this.json
	}

	toString(): string {
		return `Type<${this.expression}>`
	}

	equals(r: unknown): boolean {
		const rNode: BaseNode = isNode(r) ? r : this.$.parseDef(r)
		// a hash includes its node's kind, so nodes of different kinds aren't hashed
		if (
			this === rNode ||
			(this.kind === rNode.kind && innerHashesMatch(this, rNode))
		)
			return true
		return (
			(this.hasAlias || rNode.hasAlias) &&
			isResolutionFinal() &&
			isMutuallySimulated(this, rNode)
		)
	}

	ifEquals(r: unknown): BaseNode | undefined {
		return this.equals(r) ? this : undefined
	}

	/** whether it's a node of `kind`, narrowing it to that kind's node */
	is<kind extends NodeKind>(kind: kind): this is nodeOfKind<kind> {
		return this.kind === (kind as never)
	}

	/** it as a node of `kind`, or a thrown error if it's another kind */
	assertIs<kind extends NodeKind>(kind: kind): nodeOfKind<kind> {
		if (this.kind !== kind)
			throwError(`${this.kind} node was not of asserted kind ${kind}`)
		return this as never
	}

	hasKindIn<kinds extends NodeKind[]>(
		...kinds: kinds
	): this is nodeOfKind<kinds[number]> {
		return kinds.includes(this.kind)
	}

	isBasis(): this is nodeOfKind<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isStructural(): this is nodeOfKind<StructuralKind> {
		return includes(structuralKinds, this.kind)
	}

	isRoot(): this is BaseRoot {
		return includes(rootKinds, this.kind)
	}

	isUnknown(): boolean {
		return this.is("intersection") && this.children.length === 0
	}

	isNever(): boolean {
		return this.is("union") && this.children.length === 0
	}

	hasUnit<value>(value: unknown): this is Unit.Node & { unit: value } {
		return this.is("unit") && this.allows(value)
	}

	/** whether its kind's intersection can hold several of it, like predicates */
	canStack(): this is nodeOfKind<OpenNodeKind> {
		return this.impl.stacks as never
	}

	/** its expression written inside another, grouped where precedence needs it */
	get nestedExpr(): string {
		return this.expression
	}

	// import this overload comes first for object key completions
	// to work properly
	select<
		const selector extends NodeSelector.CompositeInput,
		predicate extends GuardablePredicate<
			NodeSelector.inferSelectKind<d["kind"], selector>
		>
	>(
		selector: NodeSelector.validateComposite<selector, predicate>
	): NodeSelector.infer<d["kind"], selector>
	select<const selector extends NodeSelector.Single>(
		selector: selector
	): NodeSelector.infer<d["kind"], selector>
	select(selector: NodeSelector): NodeSelector.BaseResult {
		const normalized = NodeSelector.normalize(selector)
		return this._select(normalized)
	}

	private _select(
		selector: NodeSelector.Normalized,
		nodes = NodeSelector.applyBoundary[selector.boundary ?? "references"](this)
	): NodeSelector.BaseResult {
		if (selector.kind) nodes = nodes.filter(n => n.kind === selector.kind)
		if (selector.where) nodes = nodes.filter(selector.where)

		return NodeSelector.applyMethod[selector.method ?? "filter"](
			nodes,
			this,
			selector
		)
	}

	transform<mapper extends DeepNodeTransformation>(
		mapper: mapper,
		opts?: DeepNodeTransformOptions
	):
		| nodeOfKind<reducibleKindOf<this["kind"]>>
		| Extract<ReturnType<mapper>, null> {
		const ctx = this._tfContext(opts)
		if (!ctx.throughAliases) return this._tf(mapper, ctx) as never
		// an alias to a resolution still transforming resolves once the transform returns
		inProgress.resolutions++
		let transformed: BaseNode | null
		try {
			transformed = this._tf(mapper, ctx)
		} finally {
			inProgress.resolutions--
			for (const id in ctx.synth) delete $ark.nodesById[ctx.synth[id].id]
		}
		if (!transformed || opts?.names) return transformed as never
		// again, now that synthetics have printed their names
		let name: string | undefined
		const names: Record<string, string> = {}
		for (const id in ctx.synth) {
			if (id === this.id) name = `synthetic${hashOf(transformed.expression)}`
			else {
				names[id] =
					`synthetic${hashOf(`${transformed.expression}\n${ctx.synth[id].name}`)}`
			}
		}
		const named =
			isEmptyObject(names) ? transformed : (
				this.transform(mapper, { ...opts, names })
			)
		if (!name) return named as never
		return printSelfAsThis(
			this.transform(mapper, {
				...opts,
				names: { ...names, [this.id]: name }
			}) as never,
			named as BaseRoot
		) as never
	}

	/** the context a transform starts with */
	protected _tfContext(
		opts: DeepNodeTransformOptions | undefined
	): DeepNodeTransformContext {
		return {
			root: this,
			selected: undefined,
			seen: {},
			path: [],
			parseOptions: {
				reduced: opts?.reduced ?? false
			},
			undeclaredHandling: undefined,
			throughAliases: isResolutionFinal(),
			synth: {},
			...opts
		}
	}

	/** transforms it and the nodes it holds with mapper, returning null to remove it */
	protected _tf(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseNode | null {
		const $ = ctx.bindScope ?? this.$
		const seen = ctx.seen[this.id]
		const transformedResolution = seen?.()
		if (transformedResolution) return transformedResolution
		if (ctx.shouldTf?.(this as never, ctx) === false) return this
		if (this.is("alias") && ctx.throughAliases) {
			const resolution = this.resolution
			if (!ctx.seen[resolution.id]) {
				const transformed = resolution._tf(mapper, ctx)
				if (!transformed) return transformed
				ctx.seen[resolution.id] = () => transformed
			}
			ctx.synth[resolution.id] ??= this.$.openSynthetic(
				ctx.names?.[resolution.id] ??
					(resolution === ctx.root ? undefined : this.expression)
			)
			return this.$.lazilyResolve(
				ctx.seen[resolution.id]! as never,
				ctx.synth[resolution.id].id
			)
		}

		let transformedNode: BaseRoot | undefined

		ctx.seen[this.id] = () => transformedNode

		if (
			this.is("structure") &&
			this.handlesUndeclared !== ctx.undeclaredHandling
		) {
			ctx = {
				...ctx,
				undeclaredHandling: this.handlesUndeclared
			}
		}

		const innerWithTransformedChildren = this._tfChildren(mapper, ctx)

		if (seen) ctx.seen[this.id] = seen
		else delete ctx.seen[this.id]

		const innerWithMeta = Object.assign(innerWithTransformedChildren, {
			meta: this.meta
		})

		let transformedInner =
			ctx.selected && !ctx.selected.includes(this) ?
				innerWithMeta
			:	mapper(this.kind, innerWithMeta, ctx)

		if (transformedInner === null) return null

		if (isNode(transformedInner))
			return (transformedNode = transformedInner as never)

		const transformedKeys = Object.keys(transformedInner)
		const hasNoTypedKeys =
			transformedKeys.length === 0 ||
			(transformedKeys.length === 1 && transformedKeys[0] === "meta")

		if (
			hasNoTypedKeys &&
			// if inner was previously an empty object (e.g. unknown) ensure it is not pruned
			!isEmptyObject(this.inner)
		)
			return null

		if (
			this.hasKindIn("required", "optional", "index") &&
			!("value" in transformedInner)
		) {
			if (!ctx.undeclaredHandling) return null
			transformedInner = {
				...transformedInner,
				value: $ark.kw.unknown
			} as never
		}

		return (transformedNode = $.node(
			this.kind,
			transformedInner as never,
			ctx.parseOptions
		) as never)
	}

	/** its inner with each child transformed, a child the mapper removed left out */
	private _tfChildren(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): Dict {
		return flatMorph(this.inner as Dict, (k, v) => {
			if (!this.impl.keys[k].child) return [k, v]
			// a morph's only child is the head of its pipeline
			if (k === "morphs") {
				const { head, piped } = this as {} as Morph.Node
				const transformed = head?._tf(mapper, ctx)
				if (transformed) return [k, [transformed, ...piped]]
				// a pruned head accepts anything, so what it piped to isn't promoted
				return [
					k,
					hasArkKind(piped[0], "root") ? [$ark.kw.unknown, ...piped] : piped
				]
			}
			const children = v as listable<BaseNode>
			if (!isArray(children)) {
				const transformed = children._tf(mapper, ctx)
				return transformed ? [k, transformed] : []
			}
			// if the value was previously explicitly set to an empty list,
			// (e.g. branches for `never`), ensure it is not pruned
			if (children.length === 0) return [k, v]
			const transformed = (
				children as array<BaseNode | Sequence.DefaultableElement>
			).flatMap<BaseNode | Sequence.DefaultableElement>(n => {
				if (isArray(n)) {
					const transformedElement = n[0]._tf(mapper, ctx)
					return transformedElement ?
							[[transformedElement as BaseRoot, n[1]]]
						:	[]
				}
				const transformedChild = n._tf(mapper, ctx)
				return transformedChild ?? []
			})
			return transformed.length ? [k, transformed] : []
		})
	}

	/** a copy with meta applied to the references a selector picks */
	configureRefs(
		meta: TypeMeta.MappableInput.Internal,
		selector: NodeSelector = "references"
	): this {
		const normalized = NodeSelector.normalize(selector)

		// a JSON Schema describes the node it's configured on, not its references
		if (
			typeof meta === "object" &&
			meta.jsonSchema &&
			normalized.boundary !== "self" &&
			!normalized.kind &&
			!normalized.where
		) {
			const { jsonSchema, ...rest } = meta
			return this.configureRefs(rest, selector).configureRefs(
				{ jsonSchema },
				"self"
			)
		}

		const mapper = (
			typeof meta === "string" ?
				(kind, inner) => ({
					...inner,
					meta: withoutReplacedKeyword(inner.meta, {
						...inner.meta,
						description: meta
					})
				})
			: typeof meta === "function" ?
				(kind, inner) => ({
					...inner,
					meta: withoutReplacedKeyword(inner.meta, meta(inner.meta))
				})
			:	(kind, inner) => ({
					...inner,
					meta: withoutReplacedKeyword(inner.meta, { ...inner.meta, ...meta })
				})) satisfies DeepNodeTransformation

		if (normalized.boundary === "self") {
			return this.$.node(
				this.kind,
				mapper(this.kind, { ...this.inner, meta: this.meta }) as never
			) as never
		}

		const rawSelected = this._select(normalized)
		const selected = rawSelected && liftArray(rawSelected)

		const shouldTf: ShouldTransformFn =
			normalized.boundary === "child" ?
				(node, ctx) => ctx.root.children.includes(node as never)
			: normalized.boundary === "shallow" ? node => node.kind !== "structure"
			: () => true

		return this.$.fin(
			this.transform(mapper, {
				shouldTf,
				selected
			}) as never
		)
	}
}

const flagBits = {
	alters: 1,
	hasMorph: 2,
	ctxPred: 4,
	isCyclic: 8,
	hasAlias: 16,
	topAlias: 32,
	allowsCtx: 64,
	ctxMorph: 128,
	keptDesc: 256,
	userCode: 512,
	costly: 1024
}

for (const name in flagBits) {
	const bit = flagBits[name as keyof typeof flagBits]
	Object.defineProperty(BaseNode.prototype, name, {
		get(this: BaseNode) {
			return (this.bits & bit) !== 0
		},
		set(this: BaseNode, value: boolean) {
			this.bits = value ? this.bits | bit : this.bits & ~bit
		}
	})
}

interface SimulationState {
	pairs: Record<string, SimulatedPair>
	pending: string[]
	failed: Record<string, true>
	comparing: string
	unfoldsAliases: boolean
	subsumes: boolean
}

// what a pair of aliases is assumed to be until their unfoldings are compared
type AssumedRelation = "simulated" | "within"

interface SimulatedPair {
	l: BaseNode
	r: BaseNode
	relation: AssumedRelation
	assumedBy: Record<string, true>
}

// a pair of aliases is assumed related until their unfoldings are compared
const isSimulated = (l: BaseNode, r: BaseNode, s: SimulationState): boolean => {
	if (innerHashesMatch(l, r)) return true
	if (l.is("alias") || r.is("alias")) {
		if (!s.unfoldsAliases) return true
		if (s.subsumes) {
			if (l.is("alias") && l.operandsBesides(r)) return true
			const others = r.is("alias") && r.operandsBesides(l)
			if (others) return others.every(other => isAssumed(l, other, s, "within"))
		}
		return isAssumed(l, r, s, "simulated")
	}
	// branches of an unreduced union may subsume each other
	if (l.is("union") && !l.inner.ordered) {
		return l.branches.every(
			branch =>
				isSimulated(branch, r, s) ||
				(s.subsumes &&
					l.branches.some(
						other =>
							other !== branch &&
							isSimulated(other, r, s) &&
							isSubsumed(branch, other, s)
					))
		)
	}
	if (r.is("union") && !r.inner.ordered)
		return r.branches.some(branch => isSimulated(l, branch, s))
	if (l.is("sequence") && r.is("sequence") && !l.defLen && !r.defLen)
		return isSequenceSimulated(l, r, s)
	const lEntries = simulatedEntriesOf(l)
	if (l.kind !== r.kind || lEntries.length !== simulatedEntriesOf(r).length)
		return false
	for (const [k, v] of lEntries) {
		if (!(k in r.inner)) return false
		if (k === "morphs") {
			const lMorphs = v as Morph.Inner["morphs"]
			const rMorphs = (r as Morph.Node).inner.morphs
			if (
				lMorphs.length !== rMorphs.length ||
				!lMorphs.every((morph, i) =>
					isNode(morph) && isNode(rMorphs[i]) ?
						isSimulated(morph, rMorphs[i] as BaseNode, s)
					:	morph === rMorphs[i]
				)
			)
				return false
			continue
		}
		if (l.impl.keys[k].child !== true) {
			if (!isJsonEqual((l.innerJson as Dict)[k], (r.innerJson as Dict)[k]))
				return false
			continue
		}
		// a broader index signature constrains more keys, so signatures must match exactly
		if (k === "signature") {
			if (!innerHashesMatch(v as BaseNode, (r.inner as Dict)[k] as BaseNode))
				return false
			continue
		}
		const lChildren = liftArray(v as listable<BaseNode>)
		const rChildren = liftArray((r.inner as Dict)[k] as listable<BaseNode>)
		if (
			lChildren.length !== rChildren.length ||
			!lChildren.every((lChild, i) => isSimulated(lChild, rChildren[i], s))
		)
			return false
	}
	return true
}

const isAssumed = (
	l: BaseNode,
	r: BaseNode,
	s: SimulationState,
	relation: AssumedRelation
): boolean => {
	const pair = `${l.id}${relation === "within" ? "<" : "|"}${r.id}`
	if (s.failed[pair]) return false
	if (s.pairs[pair]) s.pairs[pair].assumedBy[s.comparing] = true
	else {
		s.pairs[pair] = { l, r, relation, assumedBy: { [s.comparing]: true } }
		s.pending.push(pair)
	}
	return true
}

const isSequenceSimulated = (
	l: Sequence.Node,
	r: Sequence.Node,
	s: SimulationState
): boolean => {
	const minLength = Math.max(l.preLen + l.postLen, r.preLen + r.postLen)
	const maxLength = Math.min(
		l.maxLength ?? Number.POSITIVE_INFINITY,
		r.maxLength ?? Number.POSITIVE_INFINITY,
		Math.max(l.leading.length, r.leading.length) +
			Math.max(l.postLen, r.postLen) +
			1
	)
	for (let length = minLength; length <= maxLength; length++) {
		for (let i = 0; i < length; i++) {
			if (!isSimulated(elementAt(l, length, i), elementAt(r, length, i), s))
				return false
		}
	}
	return true
}

const elementAt = (node: Sequence.Node, length: number, i: number): BaseNode =>
	i < node.leading.length ? node.leading[i].node
	: i >= length - node.postLen ? node.postfix![i - length + node.postLen]
	: node.variadic!

const simulatedEntriesOf = (node: BaseNode): BaseNode["kv"] =>
	node.is("sequence") && node.inner.minVariadicLength ?
		node.kv.filter(([k]) => k !== "minVariadicLength")
	: node.is("structure") && node.inner.order ?
		node.kv.filter(([k]) => k !== "order")
	:	node.kv

let isSubsuming = false

const isSubsumed = (
	branch: BaseRoot,
	other: BaseRoot,
	s: SimulationState
): boolean => {
	let intersection: BaseRoot | Disjoint
	isSubsuming = true
	try {
		// relating them reads resolutions directly, so the intersection isn't finalized
		intersection = branch.rawIntersect(other)
	} finally {
		isSubsuming = false
	}
	return (
		!(intersection instanceof Disjoint) &&
		isSimulated(branch, intersection, s) &&
		isSimulated(intersection, branch, s)
	)
}

const isWithin = (l: BaseRoot, r: BaseRoot, s: SimulationState): boolean =>
	l.branches.every(
		lBranch =>
			r.branches.some(rBranch => isSimulated(lBranch, rBranch, s)) ||
			r.branches.some(rBranch => isSubsumed(lBranch, rBranch, s))
	)

export const isMutuallySimulated = (
	l: BaseNode,
	r: BaseNode,
	unfoldsAliases = true
): boolean =>
	_isMutuallySimulated(l, r, { unfoldsAliases, subsumes: false }) ||
	// relating a branch by extension is costly, so it's tried only once unfolding alone fails
	(unfoldsAliases &&
		!isSubsuming &&
		_isMutuallySimulated(l, r, { unfoldsAliases: true, subsumes: true }))

const _isMutuallySimulated = (
	l: BaseNode,
	r: BaseNode,
	how: Pick<SimulationState, "unfoldsAliases" | "subsumes">
): boolean => {
	const s: SimulationState = {
		pairs: {},
		pending: [],
		failed: {},
		comparing: "",
		...how
	}
	const simulates = () => isSimulated(l, r, s) && isSimulated(r, l, s)
	if (!simulates()) return false
	// a pair whose unfoldings aren't related fails each comparison that assumed it
	while (s.pending.length) {
		const pair = s.pending.pop()!
		if (s.failed[pair]) continue
		const compared = s.pairs[pair]
		s.comparing = pair
		const l = compared.l.is("alias") ? compared.l.resolution : compared.l
		const r = compared.r.is("alias") ? compared.r.resolution : compared.r
		if (
			compared.relation === "within" ?
				isWithin(l as BaseRoot, r as BaseRoot, s)
			:	isSimulated(l, r, s)
		)
			continue
		s.failed[pair] = true
		for (const comparison in compared.assumedBy) {
			if (comparison) s.pending.push(comparison)
			else {
				s.comparing = comparison
				if (!simulates()) return false
			}
		}
	}
	return true
}

// a description written over a keyword's phrase drops the keyword's identity
const withoutReplacedKeyword = (
	existing: ArkEnv.meta | undefined,
	meta: ArkEnv.meta
): ArkEnv.meta => {
	if (
		meta.keyword === undefined ||
		meta.keyword !== existing?.keyword ||
		meta.description === existing.description
	)
		return meta
	const { keyword: _, ...rest } = meta
	return rest
}

// every alias a node reaches resolves before it's compiled
export const referencesThroughAliases = (
	references: readonly BaseNode[]
): BaseNode[] => {
	// keyed by id, as a node bound to another scope keeps its id
	const reached = new Map<string, BaseNode>(
		references.map(reference => [reference.id, reference])
	)
	for (const reference of reached.values()) {
		if (!reference.is("alias")) continue
		const resolved = reference.resolution.byId
		for (const id in resolved)
			if (!reached.has(id)) reached.set(id, resolved[id])
	}
	return [...reached.values()]
}

/** a literal key (named property) or a node (index signatures) representing part of a type structure */
export type KeyOrKeyNode = Key | BaseRoot

export type GettableKeyOrNode = KeyOrKeyNode | number

// called without a handler, a root fails with its own
export type RootApply = (
	data: unknown,
	onFail: FailHandler | null | undefined
) => unknown

export type RootApplyStrategy =
	| "allows"
	| "contextual"
	| "transform"
	| "contextualTransform"

export type FlatRef<root extends BaseRoot = BaseRoot> = {
	path: array<KeyOrKeyNode>
	node: root
	propString: string
}

export type NodeSelector = NodeSelector.Single | NodeSelector.Composite

const NodeSelector = {
	applyBoundary: {
		self: node => [node],
		child: node => [...node.children],
		shallow: node => [...node.shallowRefs],
		references: node =>
			isResolutionFinal() ?
				referencesThroughAliases(node.references)
			:	[...node.references]
	} satisfies Dict<NodeSelector.Boundary, (node: BaseNode) => BaseNode[]>,
	applyMethod: {
		filter: nodes => nodes,
		assertFilter: (nodes, from, selector) => {
			if (nodes.length === 0)
				throwError(writeSelectAssertionMessage(from, selector))
			return nodes
		},
		find: nodes => nodes[0],
		assertFind: (nodes, from, selector) => {
			if (nodes.length === 0)
				throwError(writeSelectAssertionMessage(from, selector))
			return nodes[0]
		}
	} satisfies Dict<
		NodeSelector.Method,
		(nodes: BaseNode[], from: BaseNode, selector: NodeSelector) => unknown
	>,
	normalize: (selector: NodeSelector): NodeSelector.Normalized =>
		typeof selector === "function" ?
			{ boundary: "references", method: "filter", where: selector }
		: typeof selector === "string" ?
			isKeyOf(selector, NodeSelector.applyBoundary) ?
				{ method: "filter", boundary: selector }
			:	{ boundary: "references", method: "filter", kind: selector }
		:	{ boundary: "references", method: "filter", ...selector }
}

const writeSelectAssertionMessage = (from: BaseNode, selector: NodeSelector) =>
	`${from} had no references matching ${printable(selector)}.`

export declare namespace NodeSelector {
	// not generic: TS defers a generic call returning a function while
	// inferring its enclosing call (#1510)
	export interface SelectableFn<
		input,
		returns,
		kind extends NodeKind = NodeKind
	> {
		// first for object key completions
		(input: input, selector: NodeSelector.CompositeOf<kind>): returns
		(input: input, selector?: NodeSelector.Single): returns
	}

	export type CompositeOf<selfKind extends NodeKind = NodeKind> =
		| {
				[k in NodeKind]: {
					kind: k
					boundary?: Boundary
					method?: Method
					where?: GuardablePredicate<nodeOfKind<k>>
				}
		  }[NodeKind]
		| {
				[b in Boundary]: {
					kind?: undefined
					boundary: b
					method?: Method
					where?: GuardablePredicate<inferSelectKind<selfKind, b>>
				}
		  }[Boundary]
		| {
				kind?: undefined
				boundary?: undefined
				method?: Method
				where?: GuardablePredicate<inferSelectKind<selfKind, "references">>
		  }

	export type Single =
		| NodeSelector.Boundary
		| NodeSelector.Kind
		| GuardablePredicate<BaseNode>

	export type Boundary = "self" | "child" | "shallow" | "references"

	export type Kind = NodeKind

	export type Method = "filter" | "assertFilter" | "find" | "assertFind"

	export interface Composite {
		method?: Method
		boundary?: Boundary
		kind?: Kind
		where?: GuardablePredicate<BaseNode>
	}

	export type Normalized = requireKeys<Composite, "method" | "boundary">

	export type CompositeInput = Omit<Composite, "where">

	export type BaseResult = BaseNode | BaseNode[] | undefined

	export type validateComposite<selector, predicate> = {
		[k in keyof selector]: k extends "where" ? predicate
		:	conform<selector[k], CompositeInput[k & keyof CompositeInput]>
	}

	export type infer<selfKind extends NodeKind, selector> = applyMethod<
		selector extends NodeSelector.WhereCastInput<any, infer narrowed> ? narrowed
		:	NodeSelector.inferSelectKind<selfKind, selector>,
		selector
	>

	type BoundaryInput<b extends Boundary> = b | { boundary: b }
	type KindInput<k extends Kind> = k | { kind: k }
	type WhereCastInput<kindNode extends BaseNode, narrowed extends kindNode> =
		| ((In: kindNode) => In is narrowed)
		| { where: (In: kindNode) => In is narrowed }

	export type inferSelectKind<selfKind extends NodeKind, selector> =
		selectKind<selfKind, selector> extends infer kind extends NodeKind ?
			NodeKind extends kind ?
				BaseNode
			:	nodeOfKind<kind>
		:	never

	type selectKind<selfKind extends NodeKind, selector> =
		selector extends BoundaryInput<"self"> ? selfKind
		: selector extends KindInput<infer kind> ? kind
		: selector extends BoundaryInput<"child"> ? selfKind | childKindOf<selfKind>
		: NodeKind

	type applyMethod<t, selector> =
		selector extends { method: infer method extends Method } ?
			method extends "filter" ? t[]
			: method extends "assertFilter" ? [t, ...t[]]
			: method extends "find" ? t | undefined
			: method extends "assertFind" ? t
			: never
		:	// default is "filter"
			t[]
}

export const typePathToPropString = (path: array<KeyOrKeyNode>): string =>
	stringifyPath(path, {
		// symbols that print alike are still different keys
		stringifySymbol: nameOf,
		stringifyNonKey: node => node.expression
	})

export const flatRef = <node extends BaseRoot>(
	path: array<KeyOrKeyNode>,
	node: node
): FlatRef<node> => ({
	path,
	node,
	propString: typePathToPropString(path)
})

export const ioOf = <node extends BaseNode>(
	node: node,
	ioKind: "in" | "out"
): node => (ioKind === "in" ? node._in : node._out) as never

export const flatRefsAt = (key: KeyOrKeyNode, node: BaseRoot): FlatRef[] =>
	append(
		node.flatRefs.map(ref => flatRef([key, ...ref.path], ref.node)),
		flatRef([key], node)
	)

export const flatRefsAreEqual = (l: FlatRef, r: FlatRef): boolean =>
	l.propString === r.propString && l.node.equals(r.node)

export const flatMorphsAreEqual = (
	l: FlatRef<Morph.Node | Intersection.Node>,
	r: FlatRef<Morph.Node | Intersection.Node>
): boolean =>
	l.propString === r.propString &&
	(l.node.is("morph") && r.node.is("morph") ? l.node.sameMorphs(r.node)
	: l.node.is("intersection") && r.node.is("intersection") ?
		l.node.structure?.structMorph === r.node.structure?.structMorph
	:	false)

// refs are equal only at the same path
export const uniqueFlatRefs = (refs: FlatRef[]): FlatRef[] => {
	const refsByPath = new Map<string, FlatRef[]>()
	return refs.filter(ref => {
		const atPath = refsByPath.get(ref.propString)
		if (!atPath) refsByPath.set(ref.propString, [ref])
		else if (atPath.some(existing => existing.node.equals(ref.node)))
			return false
		else atPath.push(ref)
		return true
	})
}

export const appendUniqueNodes = <node extends BaseNode>(
	existing: node[] | undefined,
	refs: listable<node>
): node[] =>
	appendUnique(existing, refs, {
		isEqual: (l, r) => l.equals(r)
	})

export type DeepNodeTransformOptions = {
	/** whether a transform visits a node, else it's kept as is */
	shouldTf?: ShouldTransformFn
	bindScope?: BaseScope
	/** whether the schema is already reduced, so it's parsed as is */
	reduced?: boolean
	selected?: readonly BaseNode[] | undefined
	names?: Record<string, string>
}

export type ShouldTransformFn = (
	node: BaseNode,
	ctx: DeepNodeTransformContext
) => boolean

export interface DeepNodeTransformContext extends DeepNodeTransformOptions {
	root: BaseNode
	selected: readonly BaseNode[] | undefined
	path: mutable<array<KeyOrKeyNode>>
	seen: { [originalId: string]: (() => BaseNode | undefined) | undefined }
	parseOptions: BaseParseOptions
	undeclaredHandling: UndeclaredKeyHandling | undefined
	throughAliases: boolean
	/** the synthetic aliases a transform opened for the resolutions it transformed, by id */
	synth: Record<string, BaseParseContext>
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	innerWithMeta: Inner<kind> & { meta: ArkEnv.meta },
	ctx: DeepNodeTransformContext
) => (Inner<kind> & BaseNodeInput) | null

export const rootApplyRuntimeOf = (config: ResolvedConfig): RootApplyRuntime =>
	config.errors === "all" ? rootApplyRuntime : $ark.errorModes![config.errors]

const compileRootApply = (node: BaseRoot): RootApply =>
	new DynamicFunction<(...args: unknown[]) => RootApply>(
		...rootApplyParams,
		writeRootApply(node, node.id)
	)(node, node.$.cfg, ...Object.values(rootApplyRuntimeOf(node.$.cfg)))

export const writeInnerJson = (node: BaseNode): JsonObject => {
	const json: JsonObject = {}
	for (const [k, v] of node.kv) {
		const keyImpl = node.impl.keys[k]
		if (keyImpl.unserialized) continue
		const serialize =
			keyImpl.serialize ??
			(keyImpl.child ? serializeListableChild : defaultValueSerializer)
		json[k] = serialize(v as never)
	}
	return (node.impl.fixJson?.(json) as JsonObject | undefined) ?? json
}

const serializeListableChild = (listableNode: listable<BaseNode>) =>
	isArray(listableNode) ?
		listableNode.map(node => node.bareJson)
	:	listableNode.bareJson

const possiblyCollapse = <allowPrimitive extends boolean>(
	json: JsonObject,
	toKey: string | undefined,
	allowPrimitive: allowPrimitive
): [allowPrimitive] extends [false] ? JsonStructure : Json => {
	const collapsibleKeys = Object.keys(json)
	if (collapsibleKeys.length === 1 && collapsibleKeys[0] === toKey) {
		const collapsed = json[toKey]

		if (allowPrimitive) return collapsed as never

		if (
			// if the collapsed value is still an object
			hasDomain(collapsed, "object") &&
			// and the JSON did not include any implied keys
			(Object.keys(collapsed).length === 1 || isArray(collapsed))
		) {
			// we can replace it with its collapsed value
			return collapsed as never
		}
	}
	return json as never
}
