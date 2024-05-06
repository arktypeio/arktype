import {
	Callable,
	flatMorph,
	includes,
	isArray,
	shallowClone,
	throwError,
	type Dict,
	type Guardable,
	type Json,
	type conform,
	type listable
} from "@arktype/util"
import type { BaseConstraint } from "./constraint.js"
import type { Inner, Node, reducibleKindOf } from "./kinds.js"
import type { BaseRoot, Root } from "./roots/root.js"
import type { UnitNode } from "./roots/unit.js"
import type { RawRootScope } from "./scope.js"
import type { NodeCompiler } from "./shared/compile.js"
import type {
	BaseMeta,
	RawNodeDeclaration,
	attachmentsOf
} from "./shared/declare.js"
import {
	basisKinds,
	constraintKinds,
	precedenceOfKind,
	refinementKinds,
	rootKinds,
	type BasisKind,
	type NodeKind,
	type OpenNodeKind,
	type RefinementKind,
	type UnknownAttachments
} from "./shared/implement.js"
import {
	TraversalContext,
	type TraverseAllows,
	type TraverseApply
} from "./shared/traversal.js"

export type UnknownNode = BaseNode | Root

export abstract class BaseNode<
	/** uses -ignore rather than -expect-error because this is not an error in .d.ts
	 * @ts-ignore allow instantiation assignment to the base type */
	out d extends RawNodeDeclaration = RawNodeDeclaration
> extends Callable<(data: d["prerequisite"]) => unknown, attachmentsOf<d>> {
	constructor(public attachments: UnknownAttachments) {
		super(
			(data: any) => {
				if (
					!this.includesMorph &&
					!this.allowsRequiresContext &&
					this.allows(data)
				)
					return data

				const ctx = new TraversalContext(data, this.$.resolvedConfig)
				this.traverseApply(data, ctx)
				return ctx.finalize()
			},
			{ attach: attachments as never }
		)
		this.contributesReferencesById =
			this.id in this.referencesByName ?
				this.referencesByName
			:	{ ...this.referencesByName, [this.id]: this as never }
		this.contributesReferences = Object.values(this.contributesReferencesById)
	}

	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract traverseApply: TraverseApply<d["prerequisite"]>
	abstract expression: string
	abstract compile(js: NodeCompiler): void

	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some(child => child.includesMorph)
	readonly allowsRequiresContext: boolean =
		// if a predicate accepts exactly one arg, we can safely skip passing context
		(this.hasKind("predicate") && this.inner.predicate.length !== 1) ||
		this.kind === "alias" ||
		this.children.some(child => child.allowsRequiresContext)
	readonly referencesByName: Record<string, BaseNode> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesById),
		{}
	)
	readonly references: readonly BaseNode[] = Object.values(
		this.referencesByName
	)
	readonly contributesReferencesById: Record<string, BaseNode>
	readonly contributesReferences: readonly BaseNode[]
	readonly precedence: number = precedenceOfKind(this.kind)
	jit = false

	allows = (data: d["prerequisite"]): boolean => {
		if (this.allowsRequiresContext) {
			return this.traverseAllows(
				data as never,
				new TraversalContext(data, this.$.resolvedConfig)
			)
		}
		return (this.traverseAllows as any)(data as never)
	}

	traverse(data: d["prerequisite"]): unknown {
		return this(data)
	}

	private inCache?: BaseNode;
	get in(): BaseNode {
		this.inCache ??= this.getIo("in")
		return this.inCache as never
	}

	private outCache?: BaseNode
	get out(): BaseNode {
		this.outCache ??= this.getIo("out")
		return this.outCache as never
	}

	getIo(kind: "in" | "out"): BaseNode {
		if (!this.includesMorph) return this as never

		const ioInner: Record<any, unknown> = {}
		for (const [k, v] of this.entries) {
			const keySchemainition = this.impl.keys[k]
			if (keySchemainition.meta) continue

			if (keySchemainition.child) {
				const childValue = v as listable<BaseNode>
				ioInner[k] =
					isArray(childValue) ?
						childValue.map(child => child[kind])
					:	childValue[kind]
			} else ioInner[k] = v
		}
		return this.$.node(this.kind, ioInner)
	}

	private descriptionCache?: string
	get description(): string {
		this.descriptionCache ??=
			this.inner.description ??
			this.$.resolvedConfig[this.kind].description?.(this as never)
		return this.descriptionCache
	}

	toJSON(): Json {
		return this.json
	}

	toString(): string {
		return this.expression
	}

	equals(other: UnknownNode): boolean
	equals(other: BaseNode): boolean {
		return this.typeHash === other.typeHash
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	isBasis(): this is Node<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isConstraint(): this is BaseConstraint {
		return includes(constraintKinds, this.kind)
	}

	isRefinement(): this is Node<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isRoot(): this is BaseRoot {
		return includes(rootKinds, this.kind)
	}

	hasUnit<value>(value: unknown): this is UnitNode & { unit: value } {
		return this.hasKind("unit") && this.allows(value)
	}

	hasOpenIntersection(): this is Node<OpenNodeKind> {
		return this.impl.intersectionIsOpen as never
	}

	get nestableExpression(): string {
		return this.expression
	}

	bindScope($: RawRootScope): this {
		if (this.$ === $) return this as never
		return new (this.constructor as any)(
			Object.assign(shallowClone(this.attachments), { $ })
		)
	}

	firstReference<narrowed>(
		filter: Guardable<BaseNode, conform<narrowed, BaseNode>>
	): narrowed | undefined {
		return this.references.find(filter as never) as never
	}

	firstReferenceOrThrow<narrowed extends BaseNode>(
		filter: Guardable<BaseNode, narrowed>
	): narrowed {
		return (
			this.firstReference(filter) ??
			throwError(`${this.id} had no references matching predicate ${filter}`)
		)
	}

	firstReferenceOfKind<kind extends NodeKind>(
		kind: kind
	): Node<kind> | undefined {
		return this.firstReference((node): node is Node<kind> => node.kind === kind)
	}

	firstReferenceOfKindOrThrow<kind extends NodeKind>(kind: kind): Node<kind> {
		return (
			this.firstReference(node => node.kind === kind) ??
			throwError(`${this.id} had no ${kind} references`)
		)
	}

	transform(
		mapper: DeepNodeTransformation,
		shouldTransform: ShouldTransformFn
	): Node<reducibleKindOf<this["kind"]>> {
		return this._transform(mapper, shouldTransform, { seen: {} }) as never
	}

	private _transform(
		mapper: DeepNodeTransformation,
		shouldTransform: ShouldTransformFn,
		ctx: DeepNodeTransformationContext
	): BaseNode {
		if (ctx.seen[this.id])
			// TODO: remove cast by making lazilyResolve more flexible
			// TODO: if each transform has a unique base id, could ensure
			// these don't create duplicates
			return this.$.lazilyResolve(ctx.seen[this.id]! as never)
		if (!shouldTransform(this as never, ctx)) return this

		ctx.seen[this.id] = () => node

		const innerWithTransformedChildren = flatMorph(
			this.inner as Dict,
			(k, v) => [
				k,
				this.impl.keys[k].child ?
					isArray(v) ?
						v.map(node =>
							(node as BaseNode)._transform(mapper, shouldTransform, ctx)
						)
					:	(v as BaseNode)._transform(mapper, shouldTransform, ctx)
				:	v
			]
		)

		const node = this.$.node(
			this.kind,
			mapper(this.kind, innerWithTransformedChildren as never, ctx) as never
		)

		return node
	}

	configureShallowDescendants(configOrDescription: BaseMeta | string): this {
		const config: BaseMeta =
			typeof configOrDescription === "string" ?
				{ description: configOrDescription }
			:	(configOrDescription as never)
		return this.transform(
			(kind, inner) => ({ ...inner, ...config }),
			node => node.kind !== "structure"
		) as never
	}
}

export type ShouldTransformFn = (
	node: BaseNode,
	ctx: DeepNodeTransformationContext
) => boolean

export type DeepNodeTransformationContext = {
	seen: { [originalId: string]: (() => BaseNode) | undefined }
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	inner: Inner<kind>,
	ctx: DeepNodeTransformationContext
) => Inner<kind>
