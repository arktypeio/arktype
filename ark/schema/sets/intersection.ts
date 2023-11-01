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
	isArray,
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
import { type BasisKind, maybeParseBasis, parseBasis } from "../bases/basis.js"
import type { NonEnumerableDomain } from "../bases/domain.js"
import {
	type ConstraintContext,
	type constraintInputsByKind,
	type ConstraintKind,
	type discriminableConstraintSchema,
	parseConstraint
} from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import {
	type DiscriminableSchema,
	type Node,
	type RuleKind,
	type Schema
} from "../nodes.js"
import { RootNode } from "../root.js"

export type IntersectionInner = withAttributes<{
	readonly intersection: CollapsedIntersectionInner
}>

export type CollapsedIntersectionInner =
	| readonly [Node<BasisKind>, ...Node<ConstraintKind>[]]
	| readonly Node<ConstraintKind>[]

export type IntersectionDeclaration = declareNode<
	"intersection",
	{
		schema: IntersectionSchema
		inner: IntersectionInner
		intersections: {
			intersection: "intersection" | Disjoint
			rule: "unit" | "intersection" | Disjoint
		}
	},
	typeof IntersectionNode
>

export class IntersectionNode<t = unknown> extends RootNode<
	IntersectionDeclaration,
	t
> {
	static readonly kind = "intersection"
	readonly basis = this.intersection[0]?.isBasis()
		? this.intersection[0]
		: undefined
	readonly constraints: readonly Node<ConstraintKind>[] = this.basis
		? this.intersection.slice(1)
		: (this.intersection as any)

	static {
		this.classesByKind.intersection = this
	}

	constructor(inner: IntersectionInner) {
		super(inner)
		assertValidConstraints(this.basis, this.constraints)
	}

	static compile = this.defineCompiler((inner) => "true")

	static readonly keyKinds = this.declareKeys({
		intersection: "in"
	})

	static children(inner: IntersectionInner): readonly Node<RuleKind>[] {
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
				result = intersectRule(result.intersection, constraint)
			}
			return result
		},
		rule: (l, r) => intersectRule(l.intersection, r)
	})

	static parse(schema: IntersectionSchema) {
		const collapsedResult = maybeParseBasis(schema)
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
		alias,
		description,
		...rules
	}: Exclude<IntersectionSchema, Schema<BasisKind>>) {
		const intersectionInner = {} as mutable<IntersectionInner>
		if (alias) {
			intersectionInner.alias = alias
		}
		if (description) {
			intersectionInner.description = description
		}
		intersectionInner.intersection =
			"intersection" in rules
				? parseListedRules(rules.intersection)
				: parseMappedRules(rules)
		return new IntersectionNode(intersectionInner)
	}

	static writeDefaultDescription(inner: IntersectionInner) {
		return inner.intersection.length === 0
			? "a value"
			: inner.intersection.join(" and ")
	}
}

const parseListedRules = (
	schemas: CollapsedIntersectionSchema
): CollapsedIntersectionInner => {
	const basis = schemas[0] ? maybeParseBasis(schemas[0]) : undefined
	const rules: mutable<CollapsedIntersectionInner> = basis ? [basis] : []
	const constraintContext: ConstraintContext = { basis }
	for (let i = basis ? 1 : 0; i < schemas.length; i++) {
		rules.push(parseConstraint(schemas[i] as never, constraintContext))
	}
	return rules
}

const parseMappedRules = ({
	basis: basisSchema,
	...constraintSchemasByKind
}: MappedIntersectionSchema<any> & {
	// at this point each key should be "basis" or a constraint kind
	[k in keyof BaseAttributes]?: never
}): CollapsedIntersectionInner => {
	const basis = basisSchema ? parseBasis(basisSchema) : undefined
	const rules: mutable<CollapsedIntersectionInner> = basis ? [basis] : []
	const constraintContext: ConstraintContext = { basis }
	for (const k in constraintSchemasByKind) {
		if (!includes(constraintKinds, k)) {
			return throwParseError(`'${k}' is not a valid constraint kind`)
		}
		const schemas = constraintSchemasByKind[k]
		if (isArray(schemas)) {
			rules.push(
				...schemas.map((schema) =>
					BaseNode.classesByKind[k].parse(schema as never, constraintContext)
				)
			)
		} else {
			rules.push(
				BaseNode.classesByKind[k].parse(schemas as never, constraintContext)
			)
		}
	}
	return rules
}

const intersectRule = (
	base: readonly Node<RuleKind>[],
	rule: Node<RuleKind>
): IntersectionInner | Disjoint => {
	const result: Node<RuleKind>[] = []
	let includesConstraint = false
	for (let i = 0; i < base.length; i++) {
		const elementResult = rule.intersect(base[i])
		if (elementResult === null) {
			result.push(base[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesConstraint) {
			result.push(elementResult)
			includesConstraint = true
		} else if (!base.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
			)
		}
	}
	if (!includesConstraint) {
		result.push(rule)
	}
	return {
		intersection: result as never
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

export type MappedIntersectionSchema<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> = {
	basis?: basis
} & constraintInputsByKind<parseBasis<basis>["infer"]> &
	BaseAttributes

export type ListedIntersectionSchema<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> = {
	intersection: CollapsedIntersectionSchema<basis>
} & BaseAttributes

export type CollapsedIntersectionSchema<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> =
	| readonly [
			basis,
			...discriminableConstraintSchema<parseBasis<basis>["infer"]>[]
	  ]
	| readonly discriminableConstraintSchema<unknown>[]

// export type UnknownIntersectionSchema = {
// 	basis?: undefined
// 	predicate?: ConstraintIntersectionInput<"predicate">
// } & BaseAttributes

export type IntersectionSchema<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> = basis | MappedIntersectionSchema<basis> | ListedIntersectionSchema<basis>

export type parseIntersection<schema> = schema extends Schema<BasisKind>
	? parseBasis<schema>
	: schema extends IntersectionSchema<infer basis>
	? Schema<BasisKind> extends basis
		? IntersectionNode<unknown>
		: keyof schema & ConstraintKind extends never
		? // if there are no constraint keys, reduce to the basis node
		  parseBasis<basis>
		: IntersectionNode<parseBasis<basis>["infer"]>
	: Node<"intersection" | BasisKind>

type exactBasisMessageOnError<branch, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionSchema<schema> = schema extends
	| NonEnumerableDomain
	| AbstractableConstructor
	? schema
	: schema extends DiscriminableSchema<BasisKind>
	? exactMessageOnError<schema, DiscriminableSchema<keyof schema & BasisKind>>
	: schema extends IntersectionSchema<infer basis>
	? schema extends ListedIntersectionSchema
		? exactMessageOnError<schema, ListedIntersectionSchema<basis>>
		: exactBasisMessageOnError<schema, MappedIntersectionSchema<basis>>
	: IntersectionSchema

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
