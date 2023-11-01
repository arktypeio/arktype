import type {
	AbstractableConstructor,
	conform,
	ErrorMessage,
	exactMessageOnError,
	mutable
} from "@arktype/util"
import {
	domainOf,
	includes,
	isKeyOf,
	listFrom,
	throwInternalError,
	throwParseError,
	transform
} from "@arktype/util"
import {
	baseAttributeKeys,
	type BaseAttributes,
	BaseNode,
	constraintKinds,
	type declareNode,
	type IrreducibleRefinementKind,
	irreducibleRefinementKinds,
	orderedNodeKinds,
	type withAttributes
} from "../base.js"
import type { BasisKind, parseBasis } from "../bases/basis.js"
import type { DomainSchema, NonEnumerableDomain } from "../bases/domain.js"
import { DomainNode } from "../bases/domain.js"
import type { ProtoSchema } from "../bases/proto.js"
import { ProtoNode } from "../bases/proto.js"
import type { DiscriminableUnitSchema, UnitSchema } from "../bases/unit.js"
import { UnitNode } from "../bases/unit.js"
import { Disjoint } from "../disjoint.js"
import {
	type ConstraintKind,
	type Node,
	type NodeClass,
	type Schema
} from "../nodes.js"
import type {
	RefinementContext,
	RefinementIntersectionInput,
	RefinementKind
} from "../refinements/refinement.js"
import { RootNode } from "../root.js"
import { type MorphSchema } from "./morph.js"

export type IntersectionInner = withAttributes<{
	readonly [k in ConstraintKind]?: k extends IrreducibleRefinementKind
		? readonly Node<k>[]
		: Node<k>
}>

export type IntersectionDeclaration = declareNode<
	"intersection",
	{
		schema: IntersectionSchema
		inner: IntersectionInner
		intersections: {
			intersection: "intersection" | Disjoint
			constraint: "intersection" | Disjoint
		}
	},
	typeof IntersectionNode
>

export class IntersectionNode<t = unknown> extends RootNode<
	IntersectionDeclaration,
	t
> {
	static readonly kind = "intersection"

	static {
		this.classesByKind.intersection = this
	}

	declare readonly constraints: readonly Node<ConstraintKind>[]
	declare readonly refinements: readonly Node<RefinementKind>[]

	constructor(inner: IntersectionInner) {
		const rawConstraints = flattenConstraints(inner)
		const reducedConstraints = intersectConstraints([], rawConstraints)
		if (reducedConstraints instanceof Disjoint) {
			return reducedConstraints.throw()
		}
		if (reducedConstraints.length < rawConstraints.length) {
			const reducedInner = unflattenConstraints(reducedConstraints)
			if ("alias" in inner) {
				reducedInner.alias = inner.alias
			}
			if ("description" in inner) {
				reducedInner.description = inner.description
			}
			inner = reducedInner
		}
		super(inner)
		this.constraints = reducedConstraints
		this.basis = this.constraints[0]?.isBasis()
			? this.constraints[0]
			: undefined
		this.refinements = (
			this.constraints[0]?.isBasis()
				? this.constraints.slice(1)
				: this.constraints
		) as never
		assertValidRefinements(this.basis, this.refinements)
	}

	static compile = this.defineCompiler((inner) => "true")

	static readonly keyKinds = this.declareKeys(
		transform(orderedNodeKinds, ([, kind]) => [kind, "in"] as const)
	)

	static childrenOf(inner: IntersectionInner): readonly Node<ConstraintKind>[] {
		return Object.values(inner)
			.flat()
			.filter(
				(value): value is Node<ConstraintKind> => value instanceof BaseNode
			)
	}

	static readonly intersections = this.defineIntersections({
		intersection: (l, r) => {
			const constraints = intersectConstraints(l.constraints, r.constraints)
			return constraints instanceof Disjoint
				? constraints
				: unflattenConstraints(constraints)
		},
		constraint: (l, r) => {
			const constraints = addConstraint(l.constraints, r)
			return constraints instanceof Disjoint
				? constraints
				: unflattenConstraints(constraints)
		}
	})

	readonly basis: Node<BasisKind> | undefined;
	// for ease of use when comparing to MorphNode
	readonly in = this
	readonly out = undefined

	static parse(schema: IntersectionSchema) {
		if (typeof schema === "string") {
			return DomainNode.parse(schema)
		}
		if (typeof schema === "function") {
			return ProtoNode.parse(schema)
		}
		if (typeof schema === "object") {
			if ("is" in schema) {
				return UnitNode.parse(schema)
			}
			// this could also be UnknownBranchInput but basised makes the type
			// easier to deal with internally
			return this.parseIntersectionObjectSchema(schema as BasisedBranchInput)
		}
		return throwParseError(
			`${domainOf(schema)} is not a valid intersection schema input.`
		)
	}

	private static parseIntersectionObjectSchema(schema: BasisedBranchInput) {
		const basis: Node<BasisKind> | undefined = schema.unit
			? UnitNode.parse(schema.unit)
			: schema.proto
			? ProtoNode.parse(schema.proto)
			: schema.domain
			? DomainNode.parse(schema.domain)
			: undefined
		if (basis && Object.keys(schema).length === 1) {
			return basis
		}
		const refinementContext: RefinementContext = { basis }
		// TODO: reduction here?
		return new IntersectionNode(
			transform(schema, ([k, v]) =>
				isKeyOf(k, irreducibleRefinementKinds)
					? [
							k,
							listFrom(v).map((innerSchema) =>
								BaseNode.classesByKind[k].parse(innerSchema as never)
							)
					  ]
					: includes(constraintKinds, k)
					? [k, (BaseNode.classesByKind[k].parse as any)(v, refinementContext)]
					: isKeyOf(k, baseAttributeKeys)
					? [k, v]
					: throwParseError(`'${k}' is not a valid constraint kind`)
			) as IntersectionInner
		)
	}

	static writeDefaultDescription(inner: IntersectionInner) {
		const constraints = flattenConstraints(inner)
		return constraints.length === 0 ? "a value" : constraints.join(" and ")
	}
}

const flattenConstraints = (inner: IntersectionInner) =>
	Object.values(inner)
		.flat()
		.filter((v): v is Node<ConstraintKind> => v instanceof BaseNode)

const unflattenConstraints = (constraints: readonly Node<ConstraintKind>[]) => {
	return constraints.reduce<mutable<IntersectionInner>>((result, node) => {
		if (isKeyOf(node.kind, irreducibleRefinementKinds)) {
			const existing = result[node.kind] as
				| Node<IrreducibleRefinementKind>[]
				| undefined
			if (existing) {
				existing.push(node as never)
			} else {
				result[node.kind] = [node as never]
			}
		} else if (result[node.kind]) {
			throwInternalError(`Unexpected intersection of ${node.kind} nodes`)
		} else {
			result[node.kind] = node as never
		}
		return result
	}, {})
}

const intersectConstraints = (
	l: readonly Node<ConstraintKind>[],
	r: readonly Node<ConstraintKind>[]
) => {
	let constraints: Node<ConstraintKind>[] | Disjoint = [...l]
	for (const constraint of r) {
		if (constraints instanceof Disjoint) {
			break
		}
		constraints = addConstraint(constraints, constraint)
	}
	return constraints
}

const addConstraint = (
	constraints: readonly Node<ConstraintKind>[],
	constraint: Node<ConstraintKind>
): Node<ConstraintKind>[] | Disjoint => {
	const result: Node<ConstraintKind>[] = []
	let includesConstraint = false
	for (let i = 0; i < constraints.length; i++) {
		const elementResult = constraint.intersect(constraints[i])
		if (elementResult === null) {
			result.push(constraints[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesConstraint) {
			result.push(elementResult)
			includesConstraint = true
		} else if (!result.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
			)
		}
	}
	if (!includesConstraint) {
		result.push(constraint)
	}
	return result
}

const assertValidRefinements = (
	basis: Node<BasisKind> | undefined,
	refinements: readonly Node<RefinementKind>[]
) => {
	for (const constraint of refinements) {
		if (
			!constraint.nodeClass.basis.isUnknown() &&
			(!basis || !basis.extends(constraint.nodeClass.basis))
		) {
			throwParseError(constraint.nodeClass.writeInvalidBasisMessage(basis))
		}
	}
}

type refinementKindOf<basis> = {
	[k in RefinementKind]: basis extends NodeClass<k>["basis"]["infer"]
		? k
		: never
}[RefinementKind]

export type refinementsOf<basis> = {
	[k in refinementKindOf<basis>]?: Node<k>
}

type refinementInputsOf<basis> = {
	[k in refinementKindOf<basis>]?: RefinementIntersectionInput<k>
}

type IntersectionBasisInput<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> =
	| {
			domain: conform<basis, DomainSchema>
			proto?: never
			unit?: never
	  }
	| {
			domain?: never
			proto: conform<basis, ProtoSchema>
			unit?: never
	  }
	| {
			domain?: never
			proto?: never
			unit: conform<basis, UnitSchema>
	  }

export type BasisedBranchInput<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> = IntersectionBasisInput<basis> &
	refinementInputsOf<
		// include all refinements for the base type
		Schema<BasisKind> extends basis ? any : parseBasis<basis>
	> &
	BaseAttributes

export type UnknownBranchInput = {
	predicate?: RefinementIntersectionInput<"predicate">
} & BaseAttributes

type DiscriminableBasisInputValue =
	| AbstractableConstructor
	| NonEnumerableDomain
	| DiscriminableUnitSchema

export type IntersectionSchema<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> =
	| conform<basis, DiscriminableBasisInputValue>
	| UnknownBranchInput
	| BasisedBranchInput<basis>

export type parseIntersection<input> = input extends
	| AbstractableConstructor
	| NonEnumerableDomain
	| DiscriminableUnitSchema
	? parseBasis<input>
	: input extends IntersectionBasisInput<infer basis>
	? parseBasis<basis>
	: unknown

type exactBasisMessageOnError<branch extends BasisedBranchInput, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionInput<input> = input extends
	| NonEnumerableDomain
	| AbstractableConstructor
	? input
	: input extends DiscriminableUnitSchema
	? exactMessageOnError<input, DiscriminableUnitSchema>
	: input extends IntersectionBasisInput<infer basis>
	? exactBasisMessageOnError<input, BasisedBranchInput<basis>>
	: input extends UnknownBranchInput
	? exactMessageOnError<input, UnknownBranchInput>
	: DiscriminableUnitSchema | IntersectionSchema | MorphSchema

// export class ArrayPredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Array>,
// 	Boundable
// ) {
// 	// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// 	// to a single variadic number prop with minLength 1
// 	// Figure out best design for integrating with named props.

// 	readonly prefix?: readonly TypeRoot[]
// 	readonly variadic?: TypeRoot
// 	readonly postfix?: readonly TypeRoot[]
// }

// export class DatePredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Date>,
// 	Boundable
// ) {}
