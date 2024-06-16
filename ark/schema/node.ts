import {
	DynamicBase,
	appendUnique,
	arrayEquals,
	flatMorph,
	includes,
	isArray,
	isEmptyObject,
	registeredReference,
	throwError,
	type AppendUniqueOptions,
	type Dict,
	type Guardable,
	type Json,
	type Key,
	type conform,
	type listable
} from "@arktype/util"
import type { BaseConstraint } from "./constraint.js"
import type { Inner, MutableInner, Node, reducibleKindOf } from "./kinds.js"
import type { NodeParseOptions } from "./parse.js"
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
	type RefinementKind
} from "./shared/implement.js"
import {
	TraversalContext,
	type TraverseAllows,
	type TraverseApply
} from "./shared/traversal.js"
import { pathToPropString, type arkKind } from "./shared/utils.js"

export type UnknownNode = BaseNode | Root

export interface ContextualNodeProps {
	$: RawRootScope
}

export abstract class BaseNode<
	/** uses -ignore rather than -expect-error because this is not an error in .d.ts
	 * @ts-ignore allow instantiation assignment to the base type */
	out d extends RawNodeDeclaration = RawNodeDeclaration
> extends DynamicBase<attachmentsOf<d> & ContextualNodeProps> {
	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract traverseApply: TraverseApply<d["prerequisite"]>
	abstract expression: string
	abstract compile(js: NodeCompiler): void

	readonly unbound = this
	bindContext(ctx: ContextualNodeProps) {
		const proto = Object.create(
			this.unbound,
			Object.getOwnPropertyDescriptors(ctx)
		)
		return Object.setPrototypeOf(this.unbound.traverse.bind(proto), proto)
	}

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

	private _description?: string
	get description(): string {
		this._description ??=
			this.inner.description ??
			this.$.resolvedConfig[this.kind].description?.(this as never)
		return this._description
	}

	get references(): BaseNode[] {
		return Object.values(this.referencesById)
	}

	get contextualReferences(): ContextualReference[] {
		return this.children.reduce<ContextualReference[]>(
			(acc, child) =>
				appendUniqueContextualReferences(acc, child.contextualReferences),
			[{ path: [], node: this }]
		)
	}

	get contextualReferencesByPath() {
		return Object.groupBy(this.contextualReferences, ref =>
			pathToPropString(ref.path, {
				stringifySymbol: registeredReference,
				stringifyNonKey: node => node.expression
			})
		)
	}

	get referencesByPath() {
		return flatMorph(this.contextualReferencesByPath, (path, refs) => [
			path,
			refs.map(ref => ref.node)
		])
	}

	get expressionsByPath() {
		return flatMorph(this.contextualReferencesByPath, (path, refs) => [
			path,
			refs.map(ref => ref.node.expression)
		])
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

	traverse(data: d["prerequisite"], pipedFromCtx?: TraversalContext): unknown {
		// pipedFromCtx allows us internally to reuse TraversalContext
		// through pipes and keep track of piped paths. It is not exposed

		if (!this.includesMorph && !this.allowsRequiresContext && this.allows(data))
			return data

		if (pipedFromCtx) {
			this.traverseApply(data, pipedFromCtx)
			return pipedFromCtx.data
		}

		const ctx = new TraversalContext(data, this.$.resolvedConfig)
		this.traverseApply(data, ctx)
		return ctx.finalize()
	}

	// unfortunately we can't use the @cached
	// decorator from @arktype/util on these for now
	// as they cause a deopt in V8
	private _in?: BaseNode;
	get in(): this extends { [arkKind]: "root" } ? BaseRoot : BaseNode {
		this._in ??= this.getIo("in")
		return this._in as never
	}

	private _out?: BaseNode
	get out(): this extends { [arkKind]: "root" } ? BaseRoot : BaseNode {
		this._out ??= this.getIo("out")
		return this._out as never
	}

	getIo(kind: "in" | "out"): BaseNode {
		if (!this.includesMorph) return this as never

		const ioInner: Record<any, unknown> = {}
		for (const [k, v] of this.entries) {
			const keySchemaImplementation = this.impl.keys[k]
			if (keySchemaImplementation.meta) continue

			if (keySchemaImplementation.child) {
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

	assertHasKind<kind extends NodeKind>(kind: kind): Node<kind> {
		if (!this.kind === (kind as never))
			throwError(`${this.kind} node was not of asserted kind ${kind}`)
		return this as never
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

	firstReference<narrowed>(
		filter: Guardable<BaseNode, conform<narrowed, BaseNode>>
	): narrowed | undefined {
		return this.references.find(n => n !== this && filter(n)) as never
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

	transform<mapper extends DeepNodeTransformation>(
		mapper: mapper,
		opts?: DeepNodeTransformOptions
	): Node<reducibleKindOf<this["kind"]>> | Extract<ReturnType<mapper>, null> {
		return this._transform(mapper, {
			...opts,
			seen: {},
			path: [],
			parseOptions: {
				prereduced: opts?.prereduced ?? false
			}
		}) as never
	}

	protected _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseNode | null {
		const $ = ctx.bindScope?.internal ?? this.$
		if (ctx.seen[this.id])
			// TODO: remove cast by making lazilyResolve more flexible
			// TODO: if each transform has a unique base id, could ensure
			// these don't create duplicates
			// TODO: bindToScope?
			// TODO: io?
			return this.$.lazilyResolve(ctx.seen[this.id]! as never)
		if (ctx.shouldTransform?.(this as never, ctx) === false) return this

		let transformedNode: BaseRoot | undefined

		ctx.seen[this.id] = () => transformedNode

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
					const transformedChild = n._transform(mapper, ctx)
					return transformedChild ?? []
				})
				return transformed.length ? [k, transformed] : []
			}
		)

		delete ctx.seen[this.id]

		const transformedInner = mapper(
			this.kind,
			innerWithTransformedChildren as never,
			ctx
		)

		if (transformedInner === null) return null

		if (
			isEmptyObject(transformedInner) &&
			// if inner was previously an empty object (e.g. unknown) ensure it is not pruned
			!isEmptyObject(this.inner)
		)
			return null

		if (
			(this.kind === "required" ||
				this.kind === "optional" ||
				this.kind === "index") &&
			!("value" in transformedInner)
		)
			return null
		if (this.kind === "morph") {
			;(transformedInner as MutableInner<"morph">).in ??= $ark.intrinsic
				.unknown as never
		}

		return (transformedNode = $.node(
			this.kind,
			transformedInner,
			ctx.parseOptions
		) as never)
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

/** a list of literal keys (named properties) or a nodes (index signatures) representing a path */
export type TypePath = (Key | BaseRoot)[]

export type ContextualReference = {
	path: TypePath
	node: BaseNode
}

const uniqueContextualReferencesOptions: AppendUniqueOptions<ContextualReference> =
	{
		isEqual: (l, r) => l.node === r.node && arrayEquals(l.path, r.path)
	}

export const appendUniqueContextualReferences = (
	existing: ContextualReference[] | undefined,
	refs: listable<ContextualReference>
) => appendUnique(existing, refs, uniqueContextualReferencesOptions)

export type DeepNodeTransformOptions = {
	shouldTransform?: ShouldTransformFn
	bindScope?: RawRootScope
	prereduced?: boolean
}

export type ShouldTransformFn = (
	node: BaseNode,
	ctx: DeepNodeTransformContext
) => boolean

export interface DeepNodeTransformContext extends DeepNodeTransformOptions {
	path: TypePath
	seen: { [originalId: string]: (() => BaseNode | undefined) | undefined }
	parseOptions: NodeParseOptions
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	inner: Inner<kind>,
	ctx: DeepNodeTransformContext
) => Inner<kind> | null
