import { type extend, throwParseError } from "@arktype/util"
import { BaseNode, type withAttributes } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type { ProtoNode } from "../bases/proto.js"
import { builtins } from "../builtins.js"
import { Disjoint } from "../disjoint.js"
import { type Node } from "../nodes.js"
import { type Root } from "../root.js"
import type { declareConstraint } from "./constraint.js"
import { getBasisName } from "./shared.js"

export type BoundInner = withAttributes<{
	readonly boundKind: BoundKind
	readonly exclusive?: boolean
}>

export type BoundSchema = Omit<BoundInner, "boundKind">

export type BoundLimit = number | string

export type BoundDeclaration = MinDeclaration | MaxDeclaration

export abstract class BaseBound<
	declaration extends BoundDeclaration
> extends BaseNode<declaration> {
	readonly exclusive = this.inner.exclusive ?? false

	readonly comparator = schemaToComparator(this as never)

	// TODO; fix
	static basis: Root<number | string | readonly unknown[] | Date> =
		builtins().number
	//this.classesByKind.union.parse(["number", "string", Array, Date]) as never

	// applicableTo(basis: Node<BasisKind> | undefined): basis is BoundableBasis {
	// 	return this.boundKind === getBoundKind(basis)
	// }

	// return `BoundKind ${this.boundKind} is not applicable to ${getBasisName(
	// 	basis
	// )}`

	static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return writeUnboundableMessage(getBasisName(basis))
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

export type MinDeclaration = declareConstraint<
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
	static readonly declaration: MinDeclaration

	static {
		this.classesByKind.min = this
	}

	static readonly definition = this.define({
		kind: "min",
		keys: {
			min: "in",
			exclusive: "in",
			boundKind: "in"
		},
		intersections: {
			min: (l, r) => (l.min > r.min || (l.min === r.min && l.exclusive) ? l : r)
		},
		parse: (schema, ctx) => {
			const boundKind = getBoundKind(ctx.basis)
			return typeof schema === "object"
				? { ...schema, min: parseLimit(schema.min), boundKind }
				: { min: parseLimit(schema), boundKind }
		},
		compileCondition: (inner) =>
			`${this.argName} ${schemaToComparator(inner)} ${inner.min}`,
		writeDefaultDescription: (inner) => {
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
	})
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

export type MaxDeclaration = declareConstraint<
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
	static readonly declaration: MaxDeclaration

	static {
		this.classesByKind.max = this
	}

	static readonly definition = this.define({
		kind: "max",
		keys: {
			max: "in",
			exclusive: "in",
			boundKind: "in"
		},
		intersections: {
			max: (l, r) =>
				l.max > r.max || (l.max === r.max && l.exclusive) ? l : r,
			min: (l, r) =>
				l.max < r.min || (l.max === r.min && (l.exclusive || r.exclusive))
					? Disjoint.from("bound", l, r)
					: null
		},
		parse: (schema, ctx) => {
			const boundKind = getBoundKind(ctx.basis)
			return typeof schema === "object"
				? { ...schema, max: parseLimit(schema.max), boundKind }
				: { max: parseLimit(schema), boundKind }
		},
		compileCondition: (inner) =>
			`${this.argName} ${schemaToComparator(inner)} ${inner.max}`,
		writeDefaultDescription: (inner) => {
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
	})
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

export type NumericallyBoundable = string | number | readonly unknown[]

export type Boundable = NumericallyBoundable | Date

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be a number, string, Array, or Date`
