import { constructorExtends, type extend, throwParseError } from "@arktype/util"
import { type declareNode, defineNode, type withAttributes } from "../base.ts"
import type { BasisKind } from "../bases/basis.ts"
import { builtins } from "../builtins.ts"
import { Disjoint } from "../disjoint.ts"
import { In } from "../io/compile.ts"
import { type Node } from "../nodes.ts"
import { type ConstraintAttachments } from "./constraint.ts"

export type BoundInner = withAttributes<{
	readonly boundKind: BoundKind
	readonly exclusive?: boolean
}>

export type BoundSchema = Omit<BoundInner, "boundKind">

export type BoundLimit = number | string

export type BoundDeclaration = MinDeclaration | MaxDeclaration

export type BoundAttachments<limitKind extends LimitKind> = extend<
	ConstraintAttachments<Boundable>,
	{
		comparator: RelativeComparator<limitKind>
	}
>

const basesByBoundKind = {
	number: builtins().number,
	string: builtins().string,
	array: builtins().array,
	date: builtins().date
} as const satisfies Record<BoundKind, Node<BasisKind>>

// readonly exclusive = this.inner.exclusive ?? false

// readonly comparator = schemaToComparator(this.inner)

// readonly implicitBasis: Node<BasisKind> & { infer: Boundable } =
// 	basesByBoundKind[this.boundKind] as never

// 	static writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
// 		return writeUnboundableMessage(getBasisName(basis))
// 	}

//this.classesByKind.union.parse(["number", "string", Array, Date]) as never

// applicableTo(basis: Node<BasisKind> | undefined): basis is BoundableBasis {
// 	return this.boundKind === getBoundKind(basis)
// }

// return `BoundKind ${this.boundKind} is not applicable to ${getBasisName(
// 	basis
// )}`

export type MinInner = extend<
	BoundInner,
	{
		readonly min: number
	}
>

export type MinSchema = extend<
	BoundSchema,
	{
		readonly min: BoundLimit
	}
>

export type MinDeclaration = declareNode<{
	kind: "min"
	collapsedSchema: BoundLimit
	expandedSchema: MinSchema
	inner: MinInner
	intersections: {
		min: "min"
	}
	attach: BoundAttachments<"min">
}>

export const MinImplementation = defineNode({
	kind: "min",
	keys: {
		min: {
			parse: (_) => +_
		},
		exclusive: {},
		boundKind: {
			parse: (_, ctx) => ctx
		}
	},
	intersections: {
		min: (l, r) => (l.min > r.min || (l.min === r.min && l.exclusive) ? l : r)
	},
	expand: (schema) => {
		const boundKind = getBoundKind(ctx.basis)
		return typeof schema === "object"
			? { ...schema, min: parseLimit(schema.min), boundKind }
			: { min: parseLimit(schema), boundKind }
	},
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
	},
	attach: (inner) => {
		const comparator = `>${inner.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${inner.min}`,
			implicitBasis: basesByBoundKind[inner.boundKind]
		}
	}
})

export type MaxInner = extend<
	BoundInner,
	{
		readonly max: number
	}
>

export type MaxSchema = extend<
	BoundSchema,
	{
		readonly max: BoundLimit
	}
>

export type MaxDeclaration = declareNode<{
	kind: "max"
	collapsedSchema: BoundLimit
	expandedSchema: MaxSchema
	inner: MaxInner
	intersections: {
		max: "max"
		min: Disjoint | null
	}
	attach: BoundAttachments<"max">
}>

export const MaxImplementation = defineNode({
	kind: "max",
	keys: {
		max: {
			parse: (_) => +_
		},
		exclusive: {},
		boundKind: {}
	},
	intersections: {
		max: (l, r) => (l.max > r.max || (l.max === r.max && l.exclusive) ? l : r),
		min: (l, r) =>
			l.max < r.min || (l.max === r.min && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	},
	expand: (schema) => {
		const boundKind = getBoundKind(ctx.basis)
		return typeof schema === "object"
			? { ...schema, max: parseLimit(schema.max), boundKind }
			: { max: parseLimit(schema), boundKind }
	},
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
	},
	attach: (inner) => {
		const comparator = `<${inner.exclusive ? "" : "="}` as const
		return {
			comparator,
			condition: `${In} ${comparator} ${inner.max}`,
			implicitBasis: basesByBoundKind[inner.boundKind]
		}
	}
})

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
		(basis.kind === "proto" && constructorExtends(basis.proto, Array))
	) {
		return "array"
	}
	if (
		(basis.kind === "unit" && basis.unit instanceof Date) ||
		(basis.kind === "proto" && constructorExtends(basis.proto, Date))
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

export type RelativeComparator<kind extends LimitKind = LimitKind> = {
	min: ">" | ">="
	max: "<" | "<="
}[kind]

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
