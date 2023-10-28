import type {
	AbstractableConstructor,
	conform,
	ErrorMessage,
	exactMessageOnError,
	mutable
} from "@arktype/util"
import {
	domainOf,
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
	type IrreducibleRefinementKind,
	irreducibleRefinementKinds,
	type withAttributes
} from "./base.js"
import type { BasisKind, parseBasis } from "./constraints/basis.js"
import { basisClassesByKind } from "./constraints/basis.js"
import type { ConstraintKind } from "./constraints/constraint.js"
import type { DomainSchema, NonEnumerableDomain } from "./constraints/domain.js"
import { DomainNode } from "./constraints/domain.js"
import type { ProtoSchema } from "./constraints/proto.js"
import { ProtoNode } from "./constraints/proto.js"
import type {
	RefinementContext,
	RefinementIntersectionInput,
	RefinementKind
} from "./constraints/refinement.js"
import { refinementClassesByKind } from "./constraints/refinement.js"
import type { DiscriminableUnitSchema, UnitSchema } from "./constraints/unit.js"
import { UnitNode } from "./constraints/unit.js"
import { Disjoint } from "./disjoint.js"
import { type MorphSchema } from "./morph.js"
import { type Node, type Schema } from "./node.js"

export const constraintClassesByKind = {
	...refinementClassesByKind,
	...basisClassesByKind
}

export type IntersectionInner = withAttributes<{
	readonly [k in ConstraintKind]?: k extends IrreducibleRefinementKind
		? readonly Node<k>[]
		: Node<k>
}>

export class IntersectionNode<t = unknown> extends BaseNode<
	IntersectionInner,
	typeof IntersectionNode,
	t
> {
	static readonly kind = "intersection"

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
		transform(constraintClassesByKind, ([kind]) => [kind, "in"] as const)
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

	//explicitly allow ValidatorNode since ValidatorInner is more flexible than ValidatorSchema
	static from(schema: IntersectionSchema | IntersectionInner) {
		const inner = parseIntersectionSchema(schema as never)
		return new IntersectionNode(inner)
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
			throwInternalError(`Unexpected intersection ${node.kind} nodes`)
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
	if (constraint.isBasis() && !constraints.at(0)?.isBasis()) {
		return [constraint, ...constraints]
	}
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

const assertValidRefinements: (
	basis: Node<BasisKind> | undefined,
	refinements: readonly Node<RefinementKind>[]
) => asserts refinements is Node<RefinementKind>[] = (basis, refinements) => {
	for (const refinement of refinements) {
		if (!refinement.applicableTo(basis)) {
			throwParseError(refinement.writeInvalidBasisMessage(basis))
		}
	}
}

const parseIntersectionSchema = (
	schema: IntersectionSchema
): IntersectionInner => {
	switch (typeof schema) {
		case "string":
			return { domain: DomainNode.from(schema) }
		case "function":
			return { proto: ProtoNode.from(schema) }
		case "object":
			if ("is" in schema) {
				return { unit: UnitNode.from(schema) }
			}
			// this could also be UnknownBranchInput but basised makes the type
			// easier to deal with internally
			return parseIntersectionObjectSchema(schema as BasisedBranchInput)
		default:
			return throwParseError(
				`${domainOf(schema)} is not a valid intersection schema input.`
			)
	}
}

const parseIntersectionObjectSchema = (schema: BasisedBranchInput) => {
	const basis: Node<BasisKind> | undefined = schema.unit
		? UnitNode.from(schema.unit)
		: schema.proto
		? ProtoNode.from(schema.proto)
		: schema.domain
		? DomainNode.from(schema.domain)
		: undefined
	const refinementContext: RefinementContext = { basis }
	return transform(schema, ([k, v]) =>
		isKeyOf(k, irreducibleRefinementKinds)
			? [
					k,
					listFrom(v).map((innerSchema) =>
						constraintClassesByKind[k].from(innerSchema as never)
					)
			  ]
			: isKeyOf(k, constraintClassesByKind)
			? [k, (constraintClassesByKind[k].from as any)(v, refinementContext)]
			: isKeyOf(k, baseAttributeKeys)
			? [k, v]
			: throwParseError(`'${k}' is not a valid refinement kind`)
	) as IntersectionInner
}

type basisOf<k extends RefinementKind> = Node<k>["applicableTo"] extends ((
	_: Node<BasisKind> | undefined
) => _ is infer basis extends Node<BasisKind> | undefined)
	? basis
	: never

type refinementKindOf<basis> = {
	[k in RefinementKind]: basis extends basisOf<k> ? k : never
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
	refinementInputsOf<parseBasis<basis>> &
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
	? parseBasis<input>["infer"]
	: input extends IntersectionBasisInput<infer basis>
	? parseBasis<basis>["infer"]
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
