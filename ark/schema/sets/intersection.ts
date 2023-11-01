import type {
	AbstractableConstructor,
	conform,
	ErrorMessage,
	exactMessageOnError,
	mutable
} from "@arktype/util"
import {
	domainOf,
	entriesOf,
	includes,
	listFrom,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import {
	type BaseAttributes,
	BaseNode,
	constraintKinds,
	type declareNode,
	type withAttributes
} from "../base.js"
import {
	type BasisKind,
	maybeParseCollapsedBasis,
	parseBasis
} from "../bases/basis.js"
import type { NonEnumerableDomain } from "../bases/domain.js"
import type { DiscriminableUnitSchema } from "../bases/unit.js"
import type {
	ConstraintContext,
	constraintInputsByKind,
	ConstraintIntersectionInput,
	ConstraintKind,
	discriminableConstraintSchema
} from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import { type Node, type RuleKind, type Schema } from "../nodes.js"
import { RootNode } from "../root.js"
import { type MorphSchema } from "./morph.js"

export type IntersectionInner = withAttributes<{
	basis: Node<BasisKind> | undefined
	constraints: readonly Node<ConstraintKind>[]
}>

export type IntersectionDeclaration = declareNode<
	"intersection",
	{
		schema: IntersectionSchema
		inner: IntersectionInner
		intersections: {
			intersection: "intersection" | Disjoint
			rule: "intersection" | Disjoint
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

	constructor(inner: IntersectionInner) {
		super(inner)
		assertValidConstraints(this.basis, this.constraints)
	}

	static compile = this.defineCompiler((inner) => "true")

	static readonly keyKinds = this.declareKeys({
		basis: "in",
		constraints: "in"
	})

	static childrenOf(inner: IntersectionInner): readonly Node<RuleKind>[] {
		return Object.values(inner)
			.flat()
			.filter((value): value is Node<RuleKind> => value instanceof BaseNode)
	}

	static readonly intersections = this.defineIntersections({
		intersection: (l, r) => {
			let result: IntersectionInner | Disjoint = l
			for (const constraint of r.constraints) {
				if (result instanceof Disjoint) {
					break
				}
				result = intersectRule(result.basis, result.constraints, constraint)
			}
			return result
		},
		rule: (l, r) => intersectRule(l.basis, l.constraints, r)
	})

	static parse(schema: IntersectionSchema) {
		const collapsedResult = maybeParseCollapsedBasis(schema)
		if (collapsedResult) {
			return collapsedResult
		}
		if (typeof schema !== "object") {
			return throwParseError(
				`${domainOf(schema)} is not a valid intersection schema input`
			)
		}
		return this.parseIntersectionObjectSchema(schema)
	}

	private static parseIntersectionObjectSchema({
		basis: basisSchema,
		alias,
		description,
		...constraintSchemas
	}: ExpandedIntersectionSchema) {
		const basis = basisSchema ? parseBasis(basisSchema) : undefined
		if (basis && Object.keys(constraintSchemas).length === 0) {
			return basis
		}
		const constraintContext: ConstraintContext = { basis }
		// TODO: reduction here?
		const intersectionInner: mutable<IntersectionInner> = {
			basis,
			constraints:
				"constraints" in constraintSchemas
					? parseListedConstraints(
							constraintSchemas.constraints,
							constraintContext
					  )
					: parseMappedConstraints(
							constraintSchemas as constraintInputsByKind<any>,
							constraintContext
					  )
		}
		if (alias) {
			intersectionInner.alias = alias
		}
		if (description) {
			intersectionInner.description = description
		}
		return new IntersectionNode(intersectionInner)
	}

	static writeDefaultDescription(inner: IntersectionInner) {
		return `${inner.basis ?? "a value"}${
			inner.constraints.length ? inner.constraints.join(" and ") : ""
		}`
	}
}

const parseMappedConstraints = (
	constraints: constraintInputsByKind<any>,
	ctx: ConstraintContext
): Node<ConstraintKind>[] =>
	entriesOf(constraints).flatMap(([k, schemas]) =>
		includes(constraintKinds, k)
			? listFrom(schemas).map((schema) =>
					BaseNode.classesByKind[k].parse(schema as never, ctx)
			  )
			: throwParseError(`'${k}' is not a valid constraint kind`)
	)

const parseListedConstraints = (
	constraints: readonly discriminableConstraintSchema<any>[],
	ctx: ConstraintContext
): Node<ConstraintKind>[] =>
	constraints.map((schema) => {
		const kind = constraintKinds.find((kind) => kind in schema)
		if (!kind) {
			return throwParseError(`'${kind}' is not a valid constraint kind`)
		}
		return BaseNode.classesByKind[kind].parse(schema as never, ctx)
	})

const intersectRule = (
	basis: Node<BasisKind> | undefined,
	constraints: readonly Node<ConstraintKind>[],
	rule: Node<RuleKind>
): IntersectionInner | Disjoint => {
	if (rule.isBasis()) {
		const result = basis?.intersect(rule) ?? rule
		if (result instanceof Disjoint) {
			return result
		}
		if (rule.hasKind("unit")) {
			const disjoints: Disjoint[] = []
			for (const constraint of constraints) {
				const subresult = rule.intersect(constraint)
				if (subresult instanceof Disjoint) {
					disjoints.push(subresult)
				}
			}
			// TODO: add rest to interesctionState
			if (disjoints.length) {
				return disjoints[0]
			}
			// TODO: return unit immediately here?
			return {
				basis: rule,
				constraints: []
			}
		}
		return {
			basis: result,
			constraints
		}
	}
	const intersectedConstraints: Node<ConstraintKind>[] = []
	let includesConstraint = false
	for (let i = 0; i < constraints.length; i++) {
		const elementResult = rule.intersect(constraints[i])
		if (elementResult === null) {
			intersectedConstraints.push(constraints[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesConstraint) {
			intersectedConstraints.push(elementResult)
			includesConstraint = true
		} else if (!constraints.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
			)
		}
	}
	if (!includesConstraint) {
		intersectedConstraints.push(rule)
	}
	return {
		basis,
		constraints
	}
}

const assertValidConstraints = (
	basis: Node<BasisKind> | undefined,
	constraints: readonly Node<ConstraintKind>[]
) => {
	for (const constraint of constraints) {
		if (
			!constraint.nodeClass.basis.isUnknown() &&
			(!basis || !basis.extends(constraint.nodeClass.basis))
		) {
			throwParseError(constraint.nodeClass.writeInvalidBasisMessage(basis))
		}
	}
}

type IntersectionBasisInput<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> = {
	basis: basis
}

export type MappedBasisedBranchInput<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> = IntersectionBasisInput<basis> &
	constraintInputsByKind<parseBasis<basis>> &
	BaseAttributes

export type ListedBasisedBranchInput<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> = IntersectionBasisInput<basis> & {
	constraints: readonly discriminableConstraintSchema<parseBasis<basis>>[]
} & BaseAttributes

export type UnknownBranchInput = {
	basis?: undefined
	predicate?: ConstraintIntersectionInput<"predicate">
} & BaseAttributes

type DiscriminableBasisInputValue =
	| AbstractableConstructor
	| NonEnumerableDomain
	| DiscriminableUnitSchema

export type IntersectionSchema<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> =
	| conform<basis, DiscriminableBasisInputValue>
	| ExpandedIntersectionSchema<basis>

export type ExpandedIntersectionSchema<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> =
	| UnknownBranchInput
	| MappedBasisedBranchInput<basis>
	| ListedBasisedBranchInput<basis>

export type parseIntersection<input> = input extends
	| AbstractableConstructor
	| NonEnumerableDomain
	| DiscriminableUnitSchema
	? parseBasis<input>
	: input extends IntersectionBasisInput<infer basis>
	? parseBasis<basis>
	: unknown

type exactBasisMessageOnError<
	branch extends MappedBasisedBranchInput,
	expected
> = {
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
	? input extends ListedBasisedBranchInput
		? exactMessageOnError<input, ListedBasisedBranchInput<basis>>
		: exactBasisMessageOnError<input, MappedBasisedBranchInput<basis>>
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
