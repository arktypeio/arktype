import {
	Callable,
	type Dict,
	type Guardable,
	type Json,
	type conform,
	flatMorph,
	includes,
	isArray,
	type listable,
	shallowClone,
	throwError
} from "@arktype/util"
import type { BaseConstraintNode } from "./constraints/constraint.js"
import type { PredicateNode } from "./constraints/predicate.js"
import type { DivisorNode } from "./constraints/refinement/divisor.js"
import type { BoundNodesByKind } from "./constraints/refinement/kinds.js"
import type { RegexNode } from "./constraints/refinement/regex.js"
import type { IndexNode } from "./constraints/structural/index.js"
import type { OptionalNode } from "./constraints/structural/optional.js"
import type { RequiredNode } from "./constraints/structural/required.js"
import type { SequenceNode } from "./constraints/structural/sequence.js"
import type { StructureNode } from "./constraints/structural/structure.js"
import type { Inner, NodeDef, reducibleKindOf } from "./kinds.js"
import type { RawSchema, Schema } from "./schema.js"
import type { AliasNode } from "./schemas/alias.js"
import type { DomainNode } from "./schemas/domain.js"
import type { IntersectionNode } from "./schemas/intersection.js"
import type { MorphNode } from "./schemas/morph.js"
import type { ProtoNode } from "./schemas/proto.js"
import type { UnionNode } from "./schemas/union.js"
import type { UnitNode } from "./schemas/unit.js"
import type { RawSchemaScope } from "./scope.js"
import type { NodeCompiler } from "./shared/compile.js"
import type {
	BaseMeta,
	RawNodeDeclaration,
	attachmentsOf
} from "./shared/declare.js"
import {
	type BasisKind,
	type NodeKind,
	type OpenNodeKind,
	type RefinementKind,
	type SchemaKind,
	type StructuralKind,
	type UnknownAttachments,
	basisKinds,
	constraintKinds,
	precedenceOfKind,
	refinementKinds,
	schemaKinds,
	structuralKinds
} from "./shared/implement.js"
import {
	TraversalContext,
	type TraverseAllows,
	type TraverseApply
} from "./shared/traversal.js"

export type UnknownNode = RawNode | Schema

export abstract class RawNode<
	/** @ts-expect-error allow instantiation assignment to the base type */
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
	readonly referencesByName: Record<string, RawNode> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesById),
		{}
	)
	readonly references: readonly RawNode[] = Object.values(this.referencesByName)
	readonly contributesReferencesById: Record<string, RawNode>
	readonly contributesReferences: readonly RawNode[]
	readonly precedence = precedenceOfKind(this.kind)
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

	private inCache?: RawNode;
	get in(): RawNode {
		this.inCache ??= this.getIo("in")
		return this.inCache as never
	}

	private outCache?: RawNode
	get out(): RawNode {
		this.outCache ??= this.getIo("out")
		return this.outCache as never
	}

	getIo(kind: "in" | "out"): RawNode {
		if (!this.includesMorph) return this as never

		const ioInner: Record<any, unknown> = {}
		for (const [k, v] of this.entries) {
			const keyDefinition = this.impl.keys[k]
			if (keyDefinition.meta) continue

			if (keyDefinition.child) {
				const childValue = v as listable<RawNode>
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
	equals(other: RawNode): boolean {
		return this.typeHash === other.typeHash
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	isBasis(): this is Node<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isConstraint(): this is Constraint {
		return includes(constraintKinds, this.kind)
	}

	isRefinement(): this is Node<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isProp(): this is Node<StructuralKind> {
		return includes(structuralKinds, this.kind)
	}

	isSchema(): this is RawSchema {
		return includes(schemaKinds, this.kind)
	}

	hasUnit<value>(value: unknown): this is UnitNode & { unit: value } {
		return this.hasKind("unit") && this.allows(value)
	}

	hasOpenIntersection(): this is Node<OpenNodeKind> {
		return this.impl.intersectionIsOpen as never
	}

	get nestableExpression(): string {
		return (
				this.children.length > 1 &&
					this.children.some(child => !child.isBasis && !child.isProp())
			) ?
				`(${this.expression})`
			:	this.expression
	}

	bindScope($: RawSchemaScope): this {
		if (this.$ === $) return this as never
		return new (this.constructor as any)(
			Object.assign(shallowClone(this.attachments), { $ })
		)
	}

	firstReference<narrowed>(
		filter: Guardable<RawNode, conform<narrowed, RawNode>>
	): narrowed | undefined {
		return this.references.find(filter as never) as never
	}

	firstReferenceOrThrow<narrowed extends RawNode>(
		filter: Guardable<RawNode, narrowed>
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
		shouldTransform: (node: RawNode) => boolean
	): Node<reducibleKindOf<this["kind"]>> {
		if (!shouldTransform(this as never)) return this as never

		const innerWithTransformedChildren = flatMorph(
			this.inner as Dict,
			(k, v) => [
				k,
				this.impl.keys[k].child ?
					isArray(v) ?
						v.map(node => (node as RawNode).transform(mapper, shouldTransform))
					:	(v as RawNode).transform(mapper, shouldTransform)
				:	v
			]
		)
		return this.$.node(
			this.kind,
			mapper(this.kind, innerWithTransformedChildren as never) as never
		) as never
	}

	configureShallowDescendants(configOrDescription: BaseMeta | string): this {
		const config: BaseMeta =
			typeof configOrDescription === "string" ?
				{ description: configOrDescription }
			:	(configOrDescription as never)
		return this.transform(
			(kind, inner) => ({ ...inner, ...config }),
			node => !node.isProp()
		) as never
	}
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	inner: Inner<kind>
) => Inner<kind>

interface NodesByKind extends BoundNodesByKind {
	alias: AliasNode
	union: UnionNode
	morph: MorphNode
	intersection: IntersectionNode
	unit: UnitNode
	proto: ProtoNode
	domain: DomainNode
	divisor: DivisorNode
	regex: RegexNode
	predicate: PredicateNode
	required: RequiredNode
	optional: OptionalNode
	index: IndexNode
	sequence: SequenceNode
	structure: StructureNode
}

export type Node<kind extends NodeKind> = NodesByKind[kind]

export type SchemaDef<kind extends SchemaKind = SchemaKind> = NodeDef<kind>

export type Constraint = BaseConstraintNode
