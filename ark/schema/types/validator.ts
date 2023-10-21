import {
	domainOf,
	isKeyOf,
	listFrom,
	throwInternalError,
	throwParseError,
	transform
} from "@arktype/util"
import type {
	AbstractableConstructor,
	conform,
	ErrorMessage,
	exactMessageOnError,
	extend
} from "@arktype/util"
import { basisClassesByKind } from "../constraints/basis.js"
import type { BasisKind, parseBasis } from "../constraints/basis.js"
import type { ConstraintKind } from "../constraints/constraint.js"
import type {
	DomainSchema,
	NonEnumerableDomain
} from "../constraints/domain.js"
import { DomainNode } from "../constraints/domain.js"
import type { ProtoSchema } from "../constraints/proto.js"
import { ProtoNode } from "../constraints/proto.js"
import {
	irreducibleRefinementKinds,
	refinementClassesByKind
} from "../constraints/refinement.js"
import type {
	IrreducibleRefinementKind,
	RefinementIntersectionInput,
	RefinementKind
} from "../constraints/refinement.js"
import type { CollapsedUnitSchema, UnitSchema } from "../constraints/unit.js"
import { UnitNode } from "../constraints/unit.js"
import { Disjoint } from "../disjoint.js"
import {
	baseAttributeKeys,
	type BaseAttributes,
	BaseNode,
	type Node,
	type Schema
} from "../node.js"
import type { MorphSchema } from "./morph.js"

const constraintClassesByKind = {
	...refinementClassesByKind,
	...basisClassesByKind
}

export type IntersectionChildren = extend<
	BaseAttributes,
	{
		[k in ConstraintKind]?: k extends IrreducibleRefinementKind
			? readonly Node<k>[]
			: Node<k>
	}
>

export class ValidatorNode extends BaseNode<
	IntersectionChildren,
	typeof ValidatorNode
> {
	readonly kind = "validator"

	static keyKinds = this.declareKeys(
		transform(constraintClassesByKind, ([kind]) => [kind, "in"] as const)
	)

	declare constraints: readonly Node<ConstraintKind>[]
	declare refinements: readonly Node<RefinementKind>[]
	basis: Node<BasisKind> | undefined

	constructor(children: IntersectionChildren) {
		const rawConstraints = flattenConstraints(children)
		const reducedConstraints = intersectConstraints([], rawConstraints)
		if (reducedConstraints instanceof Disjoint) {
			return reducedConstraints.throw()
		}
		let reducedChildren = children
		if (reducedConstraints.length < rawConstraints.length) {
			reducedChildren = unflattenConstraints(reducedConstraints)
			if ("alias" in children) {
				reducedChildren.alias = children.alias
			}
			if ("description" in children) {
				reducedChildren.description = children.description
			}
		}
		super(reducedChildren)
		this.constraints = reducedConstraints
		this.basis = this.constraints[0]?.isBasis()
			? (this.constraints[0] as never)
			: undefined
		this.refinements = (
			this.constraints[0]?.isBasis()
				? this.constraints.slice(1)
				: this.constraints
		) as never
		assertValidRefinements(this.basis, this.refinements)
	}

	static from(schema: IntersectionSchema) {
		const children = parseIntersectionChildren(schema)
		return new ValidatorNode(children)
	}

	static writeDefaultDescription(children: IntersectionChildren) {
		const constraints = flattenConstraints(children)
		return constraints.length === 0 ? "a value" : constraints.join(" and ")
	}

	intersectSymmetric(other: ValidatorNode): IntersectionChildren | Disjoint {
		const constraints = intersectConstraints(
			this.constraints,
			other.constraints
		)
		return constraints instanceof Disjoint
			? constraints
			: unflattenConstraints(constraints)
	}

	filter<kind extends ConstraintKind>(kind: kind): Node<kind>[] {
		return this.constraints.filter(
			(node): node is Node<kind> => node.kind === kind
		)
	}

	get<kind extends ConstraintKind>(
		kind: kind
	):
		| (kind extends IrreducibleRefinementKind ? Node<kind>[] : Node<kind>)
		| undefined
	get(kind: ConstraintKind) {
		const constraintsOfKind = this.filter(kind)
		if (constraintsOfKind.length === 0) {
			return
		}
		return isKeyOf(kind, irreducibleRefinementKinds)
			? constraintsOfKind
			: constraintsOfKind[0]
	}
}

const flattenConstraints = (children: IntersectionChildren) =>
	Object.values(children)
		.flat()
		.filter((v): v is Node<ConstraintKind> => v instanceof BaseNode)

const unflattenConstraints = (constraints: readonly Node<ConstraintKind>[]) => {
	return constraints.reduce<IntersectionChildren>((result, node) => {
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
			throwInternalError(
				`Unexpected intersection of children of kind ${node.kind}`
			)
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

const parseIntersectionChildren = (
	schema: IntersectionSchema
): IntersectionChildren => {
	switch (typeof schema) {
		case "string":
			return { domain: DomainNode.from(schema) }
		case "function":
			return { proto: ProtoNode.from(schema) }
		case "object":
			if ("is" in schema) {
				return { unit: UnitNode.from(schema) }
			}
			return parseIntersectionObjectSchema(schema)
		default:
			return throwParseError(
				`${domainOf(schema)} is not a valid intersection schema input.`
			)
	}
}

const parseIntersectionObjectSchema = (
	schema: UnknownBranchInput | BasisedBranchInput
) =>
	transform(schema as BasisedBranchInput, ([k, v]) =>
		isKeyOf(k, irreducibleRefinementKinds)
			? [
					k,
					listFrom(v).map((childSchema) =>
						constraintClassesByKind[k].from(childSchema as never)
					)
			  ]
			: isKeyOf(k, constraintClassesByKind)
			? [k, (constraintClassesByKind[k].from as any)(v)]
			: isKeyOf(k, baseAttributeKeys)
			? [k, v]
			: throwParseError(`'${k}' is not valid on an intersection schema`)
	)

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

type ValidatorBasisInputValue = Schema<BasisKind>

type ValidatorBasisInput<
	basis extends ValidatorBasisInputValue = ValidatorBasisInputValue
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
	basis extends ValidatorBasisInputValue = ValidatorBasisInputValue
> = ValidatorBasisInput<basis> &
	refinementInputsOf<parseBasis<basis>> &
	BaseAttributes

export type UnknownBranchInput = {
	predicate?: RefinementIntersectionInput<"predicate">
} & BaseAttributes

export type IntersectionSchema<
	basis extends ValidatorBasisInputValue = ValidatorBasisInputValue
> = basis | UnknownBranchInput | BasisedBranchInput<basis>

export type parseIntersection<input> = input extends
	| AbstractableConstructor
	| NonEnumerableDomain
	? parseBasis<input>["infer"]
	: input extends ValidatorBasisInput<infer basis>
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
	: input extends CollapsedUnitSchema
	? exactMessageOnError<input, CollapsedUnitSchema>
	: input extends ValidatorBasisInput<infer basis>
	? exactBasisMessageOnError<input, BasisedBranchInput<basis>>
	: input extends UnknownBranchInput
	? exactMessageOnError<input, UnknownBranchInput>
	: CollapsedUnitSchema | IntersectionSchema | MorphSchema

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
