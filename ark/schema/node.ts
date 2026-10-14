import {
	Callable,
	DynamicFunction,
	appendUnique,
	arityOf,
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
import type { BaseConstraint } from "./constraint.ts"
import type {
	Inner,
	childKindOf,
	mutableInnerOfKind,
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
import type { NodeCompiler } from "./shared/compile.ts"
import type {
	BaseNodeDeclaration,
	BaseNodeInput,
	TypeMeta,
	attachmentsOf
} from "./shared/declare.ts"
import { Disjoint } from "./shared/disjoint.ts"
import { ArkTraversal, type ArkErrors } from "./shared/errors.ts"
import {
	ArkErrors as BaseArkErrors,
	type FailureSite,
	type SiteContext,
	type UnionSite
} from "./shared/issues.ts"
import {
	basisKinds,
	constraintKinds,
	defaultValueSerializer,
	precedenceOfKind,
	refinementKinds,
	rootKinds,
	structuralKinds,
	type BasisKind,
	type NodeKind,
	type OpenNodeKind,
	type RefinementKind,
	type StructuralKind,
	type UnknownAttachments
} from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import {
	rootApplyParams,
	rootApplyRuntime,
	writeRootApply
} from "./shared/rootApply.ts"
import {
	addErrors,
	allowsAcyclic,
	allowsInContext,
	allowsUntracked,
	applyCyclic,
	pipe,
	transform,
	transformResolution,
	type Traversal,
	type FailHandler,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "./shared/traversal.ts"
import {
	composing,
	inProgress,
	isIoFinal,
	isNode,
	isResolutionFinal,
	printSelfAsThis
} from "./shared/utils.ts"
import type { Sequence } from "./structure/sequence.ts"
import type { UndeclaredKeyHandling } from "./structure/structure.ts"

const noReferences: readonly BaseNode[] = []

const throwOnFail: ArkErrors.Handler = errors => errors.throw()

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
	$: BaseScope
	onFail: ArkErrors.Handler | null
	includesTransform: boolean
	includesMorph: boolean

	includesContextualPredicate: boolean
	isCyclic: boolean
	includesAlias: boolean
	includesShallowAlias: boolean
	allowsRequiresContext: boolean
	includesContextualMorph: boolean
	// described by another scope's writers, which a copy bound elsewhere keeps
	includesKeptDescription: boolean
	readonly cache: { rootApply?: RootApply } = {}

	protected _referencesById: Record<string, BaseNode> | undefined
	private hasReplacedReferences = false
	private _shallowReferences: BaseNode[] | undefined
	protected _flatRefs: FlatRef[] | undefined
	protected _uncollapsedInnerJson: JsonObject | undefined
	private _innerJson: JsonStructure | undefined
	private _json: JsonStructure | undefined
	private _collapsibleJson: Json | undefined
	private _innerHash: string | undefined
	private _hash: string | undefined
	protected _flatMorphs: FlatRef<Morph.Node | Intersection.Node>[] | undefined
	allows: (data: d["prerequisite"]) => boolean

	get shallowMorphs(): array<Morph> {
		return []
	}

	constructor(attachments: UnknownAttachments, $: BaseScope) {
		super(
			(
				data: any,
				pipedFromCtx?: Traversal | undefined,
				onFail: ArkErrors.Handler | null = this.onFail
			) => {
				if (pipedFromCtx) return pipe(pipedFromCtx, this, data)

				// set once and called apart from its initializer, so V8 can inline it
				const rootApply = this.cache.rootApply
				return rootApply ?
						rootApply(data, onFail)
					:	this.initRootApply()(data, onFail)
			},
			{ attach: attachedInnerOf(attachments) as never, bind: null }
		)
		// assigned one at a time, so every node of a kind shares a V8 map
		const self: mutable<UnknownAttachments> = this
		self.id = attachments.id
		self.kind = attachments.kind
		self.impl = attachments.impl
		self.inner = attachments.inner
		self.innerEntries = attachments.innerEntries
		self.meta = attachments.meta
		self.metaJson = attachments.metaJson
		self.children = attachments.children
		this.precedence = precedenceOfKind(this.kind)
		this.$ = $
		this.onFail = this.meta.onFail ?? this.$.resolvedConfig.onFail

		this.includesMorph = this.hasKind("morph")
		this.includesTransform =
			this.includesMorph ||
			(this.hasKind("sequence") && this.inner.defaultables !== undefined)

		// if a predicate accepts exactly one arg, we can safely skip passing context
		// technically, a predicate could be written like `(data, ...[ctx]) => ctx.mustBe("malicious")`
		// that would break here, but it feels like a pathological case and is better to let people optimize
		this.includesContextualPredicate =
			this.hasKind("predicate") && arityOf(this.inner.predicate) !== 1

		this.includesContextualMorph =
			this.hasKind("morph") &&
			this.inner.morphs.some(morph => isNode(morph) || arityOf(morph) !== 1)

		this.isCyclic = this.kind === "alias"
		this.includesAlias = this.isCyclic
		this.includesShallowAlias = this.isCyclic
		this.includesKeptDescription = false
		// an alias belongs in a structural value, so one there doesn't make its parent shallow
		const isStructural = this.isStructural()

		for (let i = 0; i < this.children.length; i++) {
			this.includesTransform ||= this.children[i].includesTransform
			this.includesMorph ||= this.children[i].includesMorph
			this.includesContextualPredicate ||=
				this.children[i].includesContextualPredicate
			this.includesContextualMorph ||= this.children[i].includesContextualMorph
			this.isCyclic ||= this.children[i].isCyclic
			this.includesAlias ||= this.children[i].includesAlias
			this.includesKeptDescription ||= this.children[i].includesKeptDescription
			if (!isStructural)
				this.includesShallowAlias ||= this.children[i].includesShallowAlias
		}

		this.allowsRequiresContext =
			this.includesContextualPredicate || this.isCyclic
		this.allows =
			this.allowsRequiresContext ?
				data =>
					allowsUntracked(this, data) ??
					allowsInContext(this, data, this.$.resolvedConfig)
			:	data => (this.traverseAllows as any)(data)
	}

	// set by an alias resolving to it through a thunk, which references it without registering its id
	isAliasResolution = false

	private _entersResolution: boolean | undefined
	get entersResolution(): boolean {
		if (this._entersResolution !== undefined) return this._entersResolution
		const entersResolution =
			this.isCyclic &&
			(this.isAliasResolution ||
				isNode($ark.nodesByRegisteredId[this.id]) ||
				(this.hasKind("intersection") && !!this.structure?.props.length))
		return isResolutionFinal() ?
				(this._entersResolution = entersResolution)
			:	entersResolution
	}

	private _trackedId: string | undefined
	// a root no alias references is tracked under an equal resolution its aliases reach, so an object reached again through them isn't traversed twice
	get trackedId(): string {
		if (this._trackedId) return this._trackedId
		if (!isResolutionFinal()) return this.id
		if (this.hasKind("alias") || isNode($ark.nodesByRegisteredId[this.id]))
			return (this._trackedId = this.id)
		const alias = referencesThroughAliases(this.references).find(
			reference =>
				reference.hasKind("alias") &&
				reference.resolution.kind === this.kind &&
				_isMutuallySimulated(this, reference.resolution, true, false)
		) as AliasNode | undefined
		return (this._trackedId = alias ? alias.resolution.id : this.id)
	}

	private _transforms: boolean | undefined
	// includesTransform doesn't see an alias's resolution, final once nothing but inputs and outputs is open
	get transforms(): boolean {
		if (this._transforms !== undefined) return this._transforms
		const transforms = this.reaches("includesTransform")
		return isIoFinal() ? (this._transforms = transforms) : transforms
	}

	private _allowsRequiresTraversal: boolean | undefined
	get allowsRequiresTraversal(): boolean {
		if (this._allowsRequiresTraversal !== undefined)
			return this._allowsRequiresTraversal
		const requiresTraversal = this.reaches("includesContextualPredicate")
		return isIoFinal() ?
				(this._allowsRequiresTraversal = requiresTraversal)
			:	requiresTraversal
	}

	private reaches(
		flag: "includesTransform" | "includesContextualPredicate",
		resolvesIntersections = false
	): boolean {
		if (this[flag] || !this.includesAlias) return this[flag]
		const cached =
			flag === "includesTransform" ? "_transforms" : "_allowsRequiresTraversal"
		let reachesOperands = false
		// a Map visits the ids added while it's iterated
		const reached = new Map<string, BaseNode>([[this.id, this]])
		for (const node of reached.values()) {
			for (const id in node.referencesById) {
				const reference = node.referencesById[id]
				// an intersection can drop what its operands reach, so only resolving it decides
				if (reference[flag]) return !reachesOperands || this.reaches(flag, true)
				if (!reference.hasKind("alias")) continue
				// an intersection reaches nothing its operands don't, and resolving one can create others or reenter an operand still resolving
				if (
					reference.operator === "&" &&
					!(resolvesIntersections && reference.hasResolvableOperands)
				) {
					reachesOperands ||= !resolvesIntersections
					for (const operand of reference.operands!)
						reached.set(operand.id, operand)
					continue
				}
				const registered =
					$ark.nodesByRegisteredId[reference.reference as NodeId]
				const resolution =
					isNode(registered) ? registered
					: !reference.isIo ? reference.resolution
					: flag !== "includesTransform" ?
						(reference.operands![0] as AliasNode).resolution
					:	undefined
				if (resolution && resolution[cached] !== false)
					reached.set(resolution.id, resolution)
			}
		}
		// a node this reaches reaches nothing this doesn't
		if (isIoFinal()) for (const node of reached.values()) node[cached] = false
		return false
	}

	// entered directly, it keys its output by id as an alias resolving to it does
	get isTransformedById(): boolean {
		return this.includesAlias && $ark.nodesByRegisteredId[this.id] !== undefined
	}

	get transformRequiresContext(): boolean {
		return (
			this.transforms &&
			(this.includesContextualMorph ||
				this.includesAlias ||
				(this.includesContextualPredicate && this.transformSelectsByContext))
		)
	}

	protected get transformSelectsByContext(): boolean {
		return this.children.some(child => child.transformRequiresContext)
	}

	get rootApplyStrategy(): RootApplyStrategy {
		return (
			this.transforms ?
				this.transformRequiresContext ?
					"contextualTransform"
				:	"transform"
			: this.allowsRequiresTraversal ? "contextual"
			: "allows"
		)
	}

	get referencesById(): Record<string, BaseNode> {
		return (this._referencesById ??= this.collectReferences())
	}

	get referencedBesidesChildren(): readonly BaseNode[] {
		return noReferences
	}

	private collectReferences(): Record<string, BaseNode> {
		// adding each new id to an object is slower than to a Map
		const collected = new Map<string, BaseNode>()
		let replaced = false
		const include = (node: BaseNode): void => {
			if (replaced || node._referencesById) {
				const references = node.referencesById
				if (node.hasReplacedReferences) replaced = true
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
			for (const referenced of node.referencedBesidesChildren)
				include(referenced)
		}
		include(this)
		this.hasReplacedReferences = replaced
		return Object.fromEntries(collected)
	}

	get shallowReferences(): BaseNode[] {
		return (this._shallowReferences ??=
			this.hasKind("structure") ?
				[this as BaseNode, ...(this.children as never)]
			:	this.children.reduce<BaseNode[]>(
					(acc, child) => appendUniqueNodes(acc, child.shallowReferences),
					[this]
				))
	}

	get flatRefs(): FlatRef[] {
		if (!this._flatRefs) this.initializeFlatRefs()
		return this._flatRefs!
	}

	get flatMorphs(): FlatRef<Morph.Node | Intersection.Node>[] {
		if (!this._flatMorphs) this.initializeFlatRefs()
		return this._flatMorphs!
	}

	protected initializeFlatRefs(): void {
		const flatRefs: FlatRef[] = []
		const flatMorphs: FlatRef<Morph.Node | Intersection.Node>[] = []

		for (let i = 0; i < this.children.length; i++) {
			const childFlatRefs = this.children[i].flatRefs
			for (let j = 0; j < childFlatRefs.length; j++) {
				const childRef = childFlatRefs[j]
				if (!flatRefs.some(existing => flatRefsAreEqual(existing, childRef))) {
					flatRefs.push(childRef)
					for (const branch of childRef.node.branches) {
						if (
							branch.hasKind("morph") ||
							(branch.hasKind("intersection") &&
								branch.structure?.structuralMorph !== undefined)
						) {
							flatMorphs.push({
								path: childRef.path,
								propString: childRef.propString,
								node: branch
							})
						}
					}
				}
			}
		}

		this._flatRefs = flatRefs.sort((l, r) =>
			l.path.length > r.path.length ? 1
			: l.path.length < r.path.length ? -1
			: l.propString > r.propString ? 1
			: l.propString < r.propString ? -1
			: l.node.expression < r.node.expression ? -1
			: l.node.expression > r.node.expression ? 1
			: 0
		)
		this._flatMorphs = flatMorphs
	}

	// set while a Type defers compiling until it's first used
	allowsBeforeJit: this["allows"] | undefined

	deferJit(): void {
		if (this.allowsBeforeJit) return
		this.allowsBeforeJit = this.allows
		// a detached reference can call this after compiling
		this.allows = data => {
			if (this.allowsBeforeJit) this.$.jit(this)
			return this.allows(data)
		}
	}

	private initRootApply(): RootApply {
		if (this.allowsBeforeJit) this.$.jit(this)
		return (this.cache.rootApply =
			this.compiledUnit && this.isRoot() && !this.$.resolvedConfig.jitless ?
				compileRootApply(this)
			:	this.createRootApply())
	}

	protected createRootApply(): RootApply {
		switch (this.rootApplyStrategy) {
			case "allows":
				return (data, onFail) => {
					if (this.allows(data)) return data

					return this.applyRoot(data).finalize(onFail)
				}

			case "contextual":
				return (data, onFail) => {
					if (allowsInContext(this, data, this.$.resolvedConfig)) return data

					return this.applyRoot(data).finalize(onFail)
				}

			case "transform":
			case "contextualTransform":
				if (this.includesAlias) {
					return (data, onFail) => {
						const untracked = allowsAcyclic(this, data)
						const allowed =
							untracked ?? allowsInContext(this, data, this.$.resolvedConfig)
						if (!allowed) return this.applyRoot(data).finalize(onFail)
						const ctx = new ArkTraversal(data, this.$.resolvedConfig)
						ctx.tracksTransforms = untracked === undefined
						const result = transformResolution(
							ctx,
							this.id,
							data,
							this.traverseTransform
						)
						return ctx.hasError() ? ctx.finalize(onFail) : result
					}
				}
				if (!this.transformRequiresContext) {
					if (
						(this as {} as BaseRoot).branches.every(
							branch =>
								!branch.transforms ||
								(branch.hasKind("morph") &&
									!branch.introspectableIn?.transforms)
						)
					)
						return this.createOptimisticRootApply()
					if (this.hasKind("union") && !this.compiledDiscriminant) {
						return (data, onFail) => {
							const ctx = new ArkTraversal(data, this.$.resolvedConfig)
							const result = transform(ctx, this, data)
							if (result === unset) return this.applyRoot(data).finalize(onFail)
							return ctx.hasError() ? ctx.finalize(onFail) : result
						}
					}
				}
				return (data, onFail) => {
					if (!this.allows(data)) return this.applyRoot(data).finalize(onFail)
					const ctx = new ArkTraversal(data, this.$.resolvedConfig)
					const result = transform(ctx, this, data)
					return ctx.hasError() ? ctx.finalize(onFail) : result
				}
			default:
				this.rootApplyStrategy satisfies never
				return throwInternalError(
					`Unexpected rootApplyStrategy ${this.rootApplyStrategy}`
				)
		}
	}

	// a root whose transform doesn't require ctx has only context-free morphs
	private createOptimisticRootApply(): RootApply {
		const branches = (this as {} as BaseRoot).branches
		return (data, onFail) => {
			for (let i = 0; i < branches.length; i++) {
				const branch = branches[i]
				if (!branch.allows(data)) continue
				if (!branch.hasKind("morph")) return data
				let result = data
				for (let j = 0; j < branch.morphs.length; j++) {
					// called detached, as compiled code calls it
					const morph = branch.morphs[j] as Morph.ContextFree
					const morphed = morph(result as never)
					if (morphed instanceof BaseArkErrors) {
						const ctx = new ArkTraversal(data, this.$.resolvedConfig)
						addErrors(ctx, morphed)
						return ctx.finalize(onFail)
					}
					result = morphed
				}
				return result
			}
			return this.applyRoot(data).finalize(onFail)
		}
	}

	private applyRoot(data: unknown): Traversal {
		const ctx = new ArkTraversal(data, this.$.resolvedConfig)
		if (this.includesAlias) return applyCyclic(this, data, ctx)
		this.traverseApply(data, ctx)
		return ctx
	}

	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract traverseApply: TraverseApply<d["prerequisite"]>
	declare traverseTransform: TraverseTransform<d["prerequisite"]>
	abstract expression: string
	abstract compile(js: NodeCompiler): void
	// undefined where checking data takes more than one expression
	compileCondition?(js: NodeCompiler, data: string): string | undefined

	protected _failureSite: FailureSite | UnionSite | undefined
	// what a compiled check reports when this node fails, holding the context arktype writes its error from
	get failureSite(): FailureSite | UnionSite {
		return (this._failureSite ??= {
			value: (this as never as { errorContext: SiteContext }).errorContext
		})
	}

	_description: string | undefined
	get description(): string {
		return (this._description ??=
			this.meta?.description ??
			composing(() =>
				this.$.resolvedConfig[this.kind].description(this as never)
			))
	}

	// we don't cache this currently since it can be updated once a scope finishes
	// resolving cyclic references, although it may be possible to ensure it is cached safely
	get references(): BaseNode[] {
		return Object.values(this.referencesById)
	}

	declare readonly precedence: number
	compiledUnit: Fn | undefined
	isReusableLeaf = false

	get precompilation(): string | undefined {
		if (this.allowsBeforeJit) this.$.jit(this)
		return this.compiledUnit?.toString()
	}

	// defined as an arrow function since it is often detached, e.g. when passing to tRPC
	// otherwise, would run into issues with this binding
	assert = (data: d["prerequisite"], pipedFromCtx?: Traversal): unknown =>
		this(data, pipedFromCtx, throwOnFail)

	traverse(
		data: d["prerequisite"],
		pipedFromCtx?: Traversal
	): ArkErrors | {} | null | undefined {
		return this(data, pipedFromCtx, null)
	}

	private _in: unknown;
	/** rawIn should be used internally instead */
	get in(): unknown {
		// ensure the node has been finalized if in is being used externally
		return (this._in ??=
			this.rawIn.isRoot() ? this.$.finalize(this.rawIn) : this.rawIn)
	}

	protected _rawIn: BaseNode | undefined
	get rawIn(): BaseNode {
		if (this._rawIn) return this._rawIn
		const rawIn = this.getIo("in")
		return this.includesAlias && !isIoFinal() ? rawIn : (this._rawIn = rawIn)
	}

	private _out: unknown
	/** rawOut should be used internally instead */
	get out(): unknown {
		// ensure the node has been finalized if out is being used externally
		return (this._out ??=
			this.rawOut.isRoot() ? this.$.finalize(this.rawOut) : this.rawOut)
	}

	private _rawOut: BaseNode | undefined
	get rawOut(): BaseNode {
		if (this._rawOut) return this._rawOut
		const rawOut = this.getIo("out")
		return this.includesAlias && !isIoFinal() ? rawOut : (this._rawOut = rawOut)
	}

	// Should be refactored to use transform
	// https://github.com/arktypeio/arktype/issues/1020
	getIo(ioKind: "in" | "out"): BaseNode {
		if (!this.includesTransform && !(isIoFinal() && this.transforms))
			return this as never

		const ioInner: Record<any, unknown> = {}
		for (const [k, v] of this.innerEntries) {
			const keySchemaImplementation = this.impl.keys[k]

			if (keySchemaImplementation.reduceIo)
				keySchemaImplementation.reduceIo(ioKind, ioInner, v)
			else if (keySchemaImplementation.child) {
				const childValue = v as listable<BaseNode>

				ioInner[k] =
					isArray(childValue) ?
						childValue.map(child =>
							ioKind === "in" ? child.rawIn : child.rawOut
						)
					: ioKind === "in" ? childValue.rawIn
					: childValue.rawOut
			} else ioInner[k] = v
		}

		// an alias read while definitions are open stands for its input and output alike, so a union of them is reduced once final
		return this.$.node(this.kind, ioInner as never, {
			prereduced: this.hasKind("union") && this.includesAlias && !isIoFinal()
		})
	}

	get innerJson(): JsonStructure {
		return (this._innerJson ??= possiblyCollapse(
			this.uncollapsedInnerJson,
			this.impl.collapsibleKey,
			false
		))
	}

	get json(): JsonStructure {
		return (this._json ??=
			isEmptyObject(this.meta) ?
				this.innerJson
			:	possiblyCollapse(
					{
						...this.uncollapsedInnerJson,
						meta: possiblyCollapse(
							this.metaJson as JsonObject,
							"description",
							true
						)
					},
					this.impl.collapsibleKey,
					false
				))
	}

	get collapsibleJson(): Json {
		return (this._collapsibleJson ??= possiblyCollapse(
			this.json as JsonObject,
			this.impl.collapsibleKey,
			true
		))
	}

	get innerHash(): string {
		return (this._innerHash ??= JSON.stringify({
			kind: this.kind,
			...this.innerJson
		}))
	}

	get hash(): string {
		return (this._hash ??=
			isEmptyObject(this.meta) ?
				this.innerHash
			:	JSON.stringify({ kind: this.kind, ...this.json }))
	}

	protected get uncollapsedInnerJson(): JsonObject {
		return (this._uncollapsedInnerJson ??= writeInnerJson(this))
	}

	toJSON(): JsonStructure {
		return this.json
	}

	toString(): string {
		return `Type<${this.expression}>`
	}

	equals(r: unknown): boolean {
		const rNode: BaseNode = isNode(r) ? r : this.$.parseDefinition(r)
		if (this === rNode || this.innerHash === rNode.innerHash) return true
		return (
			(this.includesAlias || rNode.includesAlias) &&
			isResolutionFinal() &&
			isMutuallySimulated(this, rNode)
		)
	}

	ifEquals(r: unknown): BaseNode | undefined {
		return this.equals(r) ? this : undefined
	}

	hasKind<kind extends NodeKind>(kind: kind): this is nodeOfKind<kind> {
		return this.kind === (kind as never)
	}

	assertHasKind<kind extends NodeKind>(kind: kind): nodeOfKind<kind> {
		if (this.kind !== kind)
			throwError(`${this.kind} node was not of asserted kind ${kind}`)
		return this as never
	}

	hasKindIn<kinds extends NodeKind[]>(
		...kinds: kinds
	): this is nodeOfKind<kinds[number]> {
		return kinds.includes(this.kind)
	}

	assertHasKindIn<kinds extends NodeKind[]>(
		...kinds: kinds
	): nodeOfKind<kinds[number]> {
		if (!includes(kinds, this.kind))
			throwError(`${this.kind} node was not one of asserted kinds ${kinds}`)
		return this as never
	}

	isBasis(): this is nodeOfKind<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isConstraint(): this is BaseConstraint {
		return includes(constraintKinds, this.kind)
	}

	isStructural(): this is nodeOfKind<StructuralKind> {
		return includes(structuralKinds, this.kind)
	}

	isRefinement(): this is nodeOfKind<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isRoot(): this is BaseRoot {
		return includes(rootKinds, this.kind)
	}

	isUnknown(): boolean {
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): boolean {
		return this.hasKind("union") && this.children.length === 0
	}

	hasUnit<value>(value: unknown): this is Unit.Node & { unit: value } {
		return this.hasKind("unit") && this.allows(value)
	}

	hasOpenIntersection(): this is nodeOfKind<OpenNodeKind> {
		return this.impl.intersectionIsOpen as never
	}

	get nestableExpression(): string {
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
		const ctx = this._createTransformContext(opts)
		if (!ctx.throughAliases) return this._transform(mapper, ctx) as never
		// an alias to a resolution still being transformed can't be resolved until the transform returns
		inProgress.resolutions++
		let transformed: BaseNode | null
		try {
			transformed = this._transform(mapper, ctx)
		} finally {
			inProgress.resolutions--
			for (const id in ctx.synthetics)
				delete $ark.nodesByRegisteredId[ctx.synthetics[id].id]
		}
		if (!transformed || opts?.names) return transformed as never
		// transformed again, since its synthetics have printed `this` or what they replaced
		let name: string | undefined
		const names: Record<string, string> = {}
		for (const id in ctx.synthetics) {
			if (id === this.id) name = `synthetic${hashOf(transformed.expression)}`
			else {
				names[id] =
					`synthetic${hashOf(`${transformed.expression}\n${ctx.synthetics[id].name}`)}`
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

	protected _createTransformContext(
		opts: DeepNodeTransformOptions | undefined
	): DeepNodeTransformContext {
		return {
			root: this,
			selected: undefined,
			seen: {},
			path: [],
			parseOptions: {
				prereduced: opts?.prereduced ?? false
			},
			undeclaredKeyHandling: undefined,
			throughAliases: isResolutionFinal(),
			synthetics: {},
			...opts
		}
	}

	protected _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseNode | null {
		const $ = ctx.bindScope ?? this.$
		const seen = ctx.seen[this.id]
		const transformedResolution = seen?.()
		if (transformedResolution) return transformedResolution
		if (ctx.shouldTransform?.(this as never, ctx) === false) return this
		if (this.hasKind("alias") && ctx.throughAliases) {
			const resolution = this.resolution
			if (!ctx.seen[resolution.id]) {
				const transformed = resolution._transform(mapper, ctx)
				if (!transformed) return transformed
				ctx.seen[resolution.id] = () => transformed
			}
			ctx.synthetics[resolution.id] ??= this.$.openSynthetic(
				ctx.names?.[resolution.id] ??
					(resolution === ctx.root ? undefined : this.expression)
			)
			return this.$.lazilyResolve(
				ctx.seen[resolution.id]! as never,
				ctx.synthetics[resolution.id].id
			)
		}

		let transformedNode: BaseRoot | undefined

		ctx.seen[this.id] = () => transformedNode

		if (
			this.hasKind("structure") &&
			this.undeclared !== ctx.undeclaredKeyHandling
		) {
			ctx = {
				...ctx,
				undeclaredKeyHandling: this.undeclared
			}
		}

		const innerWithTransformedChildren = flatMorph(
			this.inner as Dict,
			(k, v) => {
				if (!this.impl.keys[k].child) return [k, v]
				const children = v as listable<BaseNode>
				if (!isArray(children)) {
					const transformed = children._transform(mapper, ctx)
					return transformed ? [k, transformed] : []
				}
				// if the value was previously explicitly set to an empty list,
				// (e.g. branches for `never`), ensure it is not pruned
				if (children.length === 0) return [k, v]
				const transformed = children.flatMap(n => {
					// a defaultable is a [node, defaultValue] pair
					if (isArray(n)) {
						const [node, defaultValue]: Sequence.DefaultableElement = n as never
						const transformedNode = node._transform(mapper, ctx)
						return transformedNode ?
								[[transformedNode, defaultValue] as never]
							:	[]
					}
					const transformedChild = n._transform(mapper, ctx)
					return transformedChild ?? []
				})
				return transformed.length ? [k, transformed] : []
			}
		)

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
			(this.kind === "required" ||
				this.kind === "optional" ||
				this.kind === "index") &&
			!("value" in transformedInner)
		) {
			if (!ctx.undeclaredKeyHandling) return null
			transformedInner = {
				...transformedInner,
				value: $ark.intrinsic.unknown
			} as never
		}

		if (this.kind === "morph") {
			;(transformedInner as mutableInnerOfKind<"morph">).in ??= $ark.intrinsic
				.unknown as never
		}

		return (transformedNode = $.node(
			this.kind,
			transformedInner as never,
			ctx.parseOptions
		) as never)
	}

	configureReferences(
		meta: TypeMeta.MappableInput.Internal,
		selector: NodeSelector = "references"
	): this {
		const normalized = NodeSelector.normalize(selector)

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

		const shouldTransform: ShouldTransformFn =
			normalized.boundary === "child" ?
				(node, ctx) => ctx.root.children.includes(node as never)
			: normalized.boundary === "shallow" ? node => node.kind !== "structure"
			: () => true

		return this.$.finalize(
			this.transform(mapper, {
				shouldTransform,
				selected
			}) as never
		)
	}
}

interface SimulationState {
	pairs: Record<string, SimulatedPair>
	pending: string[]
	failed: Record<string, true>
	comparing: string
	unfoldsAliases: boolean
	subsumes: boolean
}

interface SimulatedPair {
	l: BaseNode
	r: BaseNode
	within: boolean
	assumedBy: Record<string, true>
}

// a cyclic node is within another if its unfolding is, so a pair of aliases is assumed related until its unfoldings are compared
const isSimulated = (l: BaseNode, r: BaseNode, s: SimulationState): boolean => {
	if (l.innerHash === r.innerHash) return true
	if (l.hasKind("alias") || r.hasKind("alias")) {
		if (!s.unfoldsAliases) return true
		if (s.subsumes) {
			if (l.hasKind("alias") && l.operandsBesides(r)) return true
			const others = r.hasKind("alias") && r.operandsBesides(l)
			if (others) return others.every(other => isAssumed(l, other, s, true))
		}
		return isAssumed(l, r, s, false)
	}
	// branches of an unreduced union may subsume each other, so each need only be within one on the other side or another branch that is
	if (l.hasKind("union") && !l.inner.ordered) {
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
	if (r.hasKind("union") && !r.inner.ordered)
		return r.branches.some(branch => isSimulated(l, branch, s))
	if (
		l.hasKind("sequence") &&
		r.hasKind("sequence") &&
		!l.defaultablesLength &&
		!r.defaultablesLength
	)
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
			if (
				JSON.stringify((l.innerJson as Dict)[k]) !==
				JSON.stringify((r.innerJson as Dict)[k])
			)
				return false
			continue
		}
		// a broader index signature constrains more keys, so signatures must match exactly
		if (k === "signature") {
			if (
				(v as BaseNode).innerHash !==
				((r.inner as Dict)[k] as BaseNode).innerHash
			)
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
	within: boolean
): boolean => {
	const pair = `${l.id}${within ? "<" : "|"}${r.id}`
	if (s.failed[pair]) return false
	if (s.pairs[pair]) s.pairs[pair].assumedBy[s.comparing] = true
	else {
		s.pairs[pair] = { l, r, within, assumedBy: { [s.comparing]: true } }
		s.pending.push(pair)
	}
	return true
}

const isSequenceSimulated = (
	l: Sequence.Node,
	r: Sequence.Node,
	s: SimulationState
): boolean => {
	const minLength = Math.max(
		l.prefixLength + l.postfixLength,
		r.prefixLength + r.postfixLength
	)
	const maxLength = Math.min(
		l.maxLength ?? Number.POSITIVE_INFINITY,
		r.maxLength ?? Number.POSITIVE_INFINITY,
		Math.max(l.prevariadic.length, r.prevariadic.length) +
			Math.max(l.postfixLength, r.postfixLength) +
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
	i < node.prevariadic.length ? node.prevariadic[i].node
	: i >= length - node.postfixLength ?
		node.postfix![i - length + node.postfixLength]
	:	node.variadic!

const simulatedEntriesOf = (node: BaseNode): BaseNode["innerEntries"] =>
	node.hasKind("sequence") && node.inner.minVariadicLength ?
		node.innerEntries.filter(([k]) => k !== "minVariadicLength")
	:	node.innerEntries

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
	_isMutuallySimulated(l, r, unfoldsAliases, false) ||
	// relating a branch by extension is costly, so it's tried only once unfolding alone fails
	(unfoldsAliases && !isSubsuming && _isMutuallySimulated(l, r, true, true))

const _isMutuallySimulated = (
	l: BaseNode,
	r: BaseNode,
	unfoldsAliases: boolean,
	subsumes: boolean
): boolean => {
	const s: SimulationState = {
		pairs: {},
		pending: [],
		failed: {},
		comparing: "",
		unfoldsAliases,
		subsumes
	}
	const simulates = () => isSimulated(l, r, s) && isSimulated(r, l, s)
	if (!simulates()) return false
	// a pair whose unfoldings aren't related fails each comparison that assumed it, so each is compared again
	while (s.pending.length) {
		const pair = s.pending.pop()!
		if (s.failed[pair]) continue
		const compared = s.pairs[pair]
		s.comparing = pair
		const l = compared.l.hasKind("alias") ? compared.l.resolution : compared.l
		const r = compared.r.hasKind("alias") ? compared.r.resolution : compared.r
		if (
			compared.within ?
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

// a description written over a keyword's phrase is authored text, so the
// node no longer has the keyword's identity
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

// a traversal reads whether an alias resolves to it, so every alias a node reaches resolves before it's compiled
export const referencesThroughAliases = (
	references: readonly BaseNode[]
): BaseNode[] => {
	// keyed by id, as a node bound to another scope keeps its id
	const reached = new Map<string, BaseNode>(
		references.map(reference => [reference.id, reference])
	)
	for (const reference of reached.values()) {
		if (!reference.hasKind("alias")) continue
		const resolved = reference.resolution.referencesById
		for (const id in resolved)
			if (!reached.has(id)) reached.set(id, resolved[id])
	}
	return [...reached.values()]
}

/** a literal key (named property) or a node (index signatures) representing part of a type structure */
export type KeyOrKeyNode = Key | BaseRoot

export type GettableKeyOrNode = KeyOrKeyNode | number

export type RootApply = (data: unknown, onFail: FailHandler | null) => unknown

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
		shallow: node => [...node.shallowReferences],
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
	export type SelectableFn<input, returns, kind extends NodeKind = NodeKind> = {
		// this overload must come first for object key completions to work
		<
			const selector extends NodeSelector.CompositeInput,
			predicate extends GuardablePredicate<
				NodeSelector.inferSelectKind<kind, selector>
			>
		>(
			input: input,
			selector?: NodeSelector.validateComposite<selector, predicate>
		): returns
		<const selector extends NodeSelector.Single>(
			input: input,
			selector?: selector
		): returns
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

const attachedInnerOf = (attachments: UnknownAttachments): dict | undefined => {
	if (attachments.kind === "intersection") return
	const attached: dict = {}
	for (const k in attachments.impl.keys)
		if (k !== "in" && k !== "out") attached[k] = attachments.inner[k]
	return attached
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

export const flatRefsAreEqual = (l: FlatRef, r: FlatRef): boolean =>
	l.propString === r.propString && l.node.equals(r.node)

export const flatMorphsAreEqual = (
	l: FlatRef<Morph.Node | Intersection.Node>,
	r: FlatRef<Morph.Node | Intersection.Node>
): boolean =>
	l.propString === r.propString &&
	(l.node.hasKind("morph") && r.node.hasKind("morph") ?
		l.node.hasEqualMorphs(r.node)
	: l.node.hasKind("intersection") && r.node.hasKind("intersection") ?
		l.node.structure?.structuralMorph === r.node.structure?.structuralMorph
	:	false)

export const appendUniqueFlatRefs = <node extends BaseRoot>(
	existing: FlatRef<node>[] | undefined,
	refs: listable<FlatRef<node>>
): FlatRef<node>[] =>
	appendUnique(existing, refs, {
		isEqual: flatRefsAreEqual
	})

export const appendUniqueNodes = <node extends BaseNode>(
	existing: node[] | undefined,
	refs: listable<node>
): node[] =>
	appendUnique(existing, refs, {
		isEqual: (l, r) => l.equals(r)
	})

export type DeepNodeTransformOptions = {
	shouldTransform?: ShouldTransformFn
	bindScope?: BaseScope
	prereduced?: boolean
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
	undeclaredKeyHandling: UndeclaredKeyHandling | undefined
	throughAliases: boolean
	synthetics: Record<string, BaseParseContext>
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	innerWithMeta: Inner<kind> & { meta: ArkEnv.meta },
	ctx: DeepNodeTransformContext
) => (Inner<kind> & BaseNodeInput) | null

// createRootApply's statements, compiled per root so V8 can inline its calls
const compileRootApply = (node: BaseRoot): RootApply =>
	new DynamicFunction<(...args: unknown[]) => RootApply>(
		...rootApplyParams,
		writeRootApply(node, node.id)
	)(node, node.$.resolvedConfig, ...Object.values(rootApplyRuntime))

export const writeInnerJson = (node: BaseNode): JsonObject => {
	const json: JsonObject = {}
	for (const [k, v] of node.innerEntries) {
		const keyImpl = node.impl.keys[k]
		const serialize =
			keyImpl.serialize ??
			(keyImpl.child ? serializeListableChild : defaultValueSerializer)
		json[k] = serialize(v as never)
	}
	return (node.impl.finalizeInnerJson?.(json) as JsonObject | undefined) ?? json
}

const serializeListableChild = (listableNode: listable<BaseNode>) =>
	isArray(listableNode) ?
		listableNode.map(node => node.collapsibleJson)
	:	listableNode.collapsibleJson

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
			(Object.keys(collapsed).length === 1 || Array.isArray(collapsed))
		) {
			// we can replace it with its collapsed value
			return collapsed as never
		}
	}
	return json as never
}
