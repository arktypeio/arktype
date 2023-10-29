import { type extend, throwParseError } from "@arktype/util"
import { BaseNode, type declareNode, type withAttributes } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type { DomainNode } from "../bases/domain.js"
import type { ProtoNode } from "../bases/proto.js"
import { Disjoint } from "../disjoint.js"
import { type Node } from "../nodes.js"
import type { BaseRefinement, RefinementContext } from "./refinement.js"
import { getBasisName } from "./shared.js"

export type BoundInner = withAttributes<{
	readonly boundKind: BoundKind
	readonly exclusive?: boolean
}>

export type BoundSchema = Omit<BoundInner, "boundKind">

export type BoundLimit = number | string

export type BoundDeclaration = MinDeclaration | MaxDeclaration

export abstract class BaseBound<declaration extends BoundDeclaration>
	extends BaseNode<declaration>
	implements BaseRefinement
{
	readonly exclusive = this.inner.exclusive ?? false

	readonly comparator = schemaToComparator(this as never)

	applicableTo(basis: Node<BasisKind> | undefined): basis is BoundableBasis {
		return this.boundKind === getBoundKind(basis)
	}

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return `BoundKind ${this.boundKind} is not applicable to ${getBasisName(
			basis
		)}`
	}
}

export type MinInner = extend<
	BoundInner,
	{
		readonly min: number
	}
>

export type ExpandedMinSchema = extend<
	BoundSchema,
	{
		readonly min: BoundLimit
	}
>

export type MinSchema = BoundLimit | ExpandedMinSchema

export type MinDeclaration = declareNode<
	"min",
	{
		schema: MinSchema
		inner: MinInner
		intersections: {
			min: "min"
		}
	},
	typeof MinNode
>

export class MinNode extends BaseBound<MinDeclaration> {
	static readonly kind = "min"

	static {
		this.classesByKind.min = this
	}

	static readonly keyKinds = this.declareKeys({
		min: "in",
		exclusive: "in",
		boundKind: "in"
	})

	static from(schema: MinSchema, ctx: RefinementContext) {
		const boundKind = getBoundKind(ctx.basis)
		return new MinNode(
			typeof schema === "object"
				? { ...schema, min: parseLimit(schema.min), boundKind }
				: { min: parseLimit(schema), boundKind }
		)
	}

	static readonly compile = this.defineCompiler(
		(inner) => `${this.argName} ${schemaToComparator(inner)} ${inner.min}`
	)

	static readonly intersections = this.defineIntersections({
		min: (l, r) => (l.min > r.min || (l.min === r.min && l.exclusive) ? l : r)
	})

	static writeDefaultDescription(inner: MinInner) {
		const comparisonDescription =
			inner.boundKind === "date"
				? inner.exclusive
					? "after"
					: "at or after"
				: inner.exclusive
				? "more than"
				: "at least"
		return `${comparisonDescription} ${inner.min}`
	}
}

export type MaxInner = extend<
	BoundInner,
	{
		readonly max: number
	}
>

export type ExpandedMaxSchema = extend<
	BoundSchema,
	{
		readonly max: BoundLimit
	}
>

export type MaxSchema = BoundLimit | ExpandedMaxSchema

export type MaxDeclaration = declareNode<
	"max",
	{
		schema: MaxSchema
		inner: MaxInner
		intersections: {
			max: "max"
			min: Disjoint | null
		}
	},
	typeof MaxNode
>

export class MaxNode extends BaseBound<MaxDeclaration> {
	static readonly kind = "max"

	static {
		this.classesByKind.max = this
	}

	static readonly intersections = this.defineIntersections({
		max: (l, r) => (l.max > r.max || (l.max === r.max && l.exclusive) ? l : r),
		min: (l, r) =>
			l.max < r.min || (l.max === r.min && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	})

	static readonly keyKinds = this.declareKeys({
		max: "in",
		exclusive: "in",
		boundKind: "in"
	})

	static readonly compile = this.defineCompiler(
		(inner) => `${this.argName} ${schemaToComparator(inner)} ${inner.max}`
	)

	static writeDefaultDescription(inner: MaxInner) {
		const comparisonDescription =
			inner.boundKind === "date"
				? inner.exclusive
					? "before"
					: "at or before"
				: inner.exclusive
				? "less than"
				: "at most"
		return `${comparisonDescription} ${inner.max}`
	}

	static from(schema: MaxSchema, ctx: RefinementContext) {
		const boundKind = getBoundKind(ctx.basis)
		return new MaxNode(
			typeof schema === "object"
				? { ...schema, max: parseLimit(schema.max), boundKind }
				: { max: parseLimit(schema), boundKind }
		)
	}
}

const parseLimit = (limitLiteral: BoundLimit): number =>
	typeof limitLiteral === "string"
		? new Date(limitLiteral).valueOf()
		: limitLiteral

const getBoundKind = (basis: Node<BasisKind> | undefined): BoundKind => {
	if (basis === undefined) {
		return throwParseError(writeUnboundableMessage("unknown"))
	}
	if (basis.domain === "number" || basis.domain === "string") {
		return basis.domain
	}
	if (
		(basis.kind === "unit" && basis.unit instanceof Array) ||
		(basis.kind === "proto" && basis.extendsOneOf(Array))
	) {
		return "array"
	}
	if (
		(basis.kind === "unit" && basis.unit instanceof Date) ||
		(basis.kind === ("proto" as never) &&
			(basis as {} as ProtoNode).extendsOneOf(Date))
	) {
		return "date"
	}
	return throwParseError(writeUnboundableMessage(basis.basisName))
}

type BoundableBasis =
	| DomainNode<"number" | "string">
	| ProtoNode<typeof Array | typeof Date>

const unitsByBoundKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundKind = keyof typeof unitsByBoundKind

export type LimitKind = "min" | "max"

export const schemaToComparator = <
	schema extends ExpandedMinSchema | ExpandedMaxSchema
>(
	schema: schema
) =>
	`${
		("min" in schema ? ">" : "<") as schema extends ExpandedMinSchema
			? ">"
			: "<"
	}${schema.exclusive ? "" : "="}`

export const writeIncompatibleRangeMessage = (l: BoundKind, r: BoundKind) =>
	`Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be a number, string, Array, or Date`
