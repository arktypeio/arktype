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
	type Key,
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
	}

	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract traverseApply: TraverseApply<d["prerequisite"]>
	abstract expression: string
	abstract compile(js: NodeCompiler): void

	readonly qualifiedId = `${this.$.id}${this.id}`
	readonly includesMorph: boolean =
		this.kind === "morph" ||
		(this.hasKind("optional") && this.hasDefault()) ||
		(this.hasKind("structure") && this.undeclared === "delete") ||
		this.children.some(child => child.includesMorph)
	readonly allowsRequiresContext: boolean =
		// if a predicate accepts exactly one arg, we can safely skip passing context
		(this.hasKind("predicate") && this.inner.predicate.length !== 1) ||
		this.kind === "alias" ||
		this.children.some(child => child.allowsRequiresContext)
	readonly referencesById: Record<string, BaseNode> = this.children.reduce(
		(result, child) => Object.assign(result, child.referencesById),
		{ [this.id]: this }
	)

	get references(): BaseNode[] {
		return Object.values(this.referencesById)
	}

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

	// unfortunately we can't use the @cached
	// decorator from @arktype/util on these for now
	// as they cause a deopt in V8
	private _in?: BaseNode;
	get in(): BaseNode {
		this._in ??= this.getIo("in")
		return this._in as never
	}

	private _out?: BaseNode
	get out(): BaseNode {
		this._out ??= this.getIo("out")
		return this._out as never
	}

	private _description?: string
	get description(): string {
		this._description ??=
			this.inner.description ??
			this.$.resolvedConfig[this.kind].description?.(this as never)
		return this._description
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
		opts?: DeepNodeTransformOptions
	): Node<reducibleKindOf<this["kind"]>> {
		return this._transform(mapper, {
			seen: {},
			path: [],
			shouldTransform: opts?.shouldTransform ?? (() => true)
		}) as never
	}

	protected _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformationContext
	): BaseNode {
		if (ctx.seen[this.id])
			// TODO: remove cast by making lazilyResolve more flexible
			// TODO: if each transform has a unique base id, could ensure
			// these don't create duplicates
			return this.$.lazilyResolve(ctx.seen[this.id]! as never)
		if (!ctx.shouldTransform(this as never, ctx)) return this

		ctx.seen[this.id] = () => node

		const innerWithTransformedChildren = flatMorph(
			this.inner as Dict,
			(k, v) => {
				if (!this.impl.keys[k].child) return [k, v]
				const children = v as listable<BaseNode>
				if (!isArray(children)) {
					const transformed = children._transform(mapper, ctx)
					return transformed ? [k, transformed] : []
				}
				const transformed = children.flatMap(n => {
					const transformedChild = n._transform(mapper, ctx)
					return transformedChild ?? []
				})
				return transformed.length ? [k, transformed] : []
			}
		)

		delete ctx.seen[this.id]

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
		return this.transform((kind, inner) => ({ ...inner, ...config }), {
			shouldTransform: node => node.kind !== "structure"
		}) as never
	}
}

export type DeepNodeTransformOptions = {
	shouldTransform: ShouldTransformFn
}

export type ShouldTransformFn = (
	node: BaseNode,
	ctx: DeepNodeTransformationContext
) => boolean

export type DeepNodeTransformationContext = {
	/** a literal key or a node representing the key of an index signature */
	path: Array<Key | BaseNode>
	seen: { [originalId: string]: (() => BaseNode) | undefined }
	shouldTransform: ShouldTransformFn
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	inner: Inner<kind>,
	ctx: DeepNodeTransformationContext
) => Inner<kind> | null
