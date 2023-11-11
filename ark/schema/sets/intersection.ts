import type {
	conform,
	ErrorMessage,
	exactMessageOnError,
	extend,
	mutable
} from "@arktype/util"
import { hasDomain, throwInternalError } from "@arktype/util"
import {
	type BaseAttributes,
	type declareNode,
	defineNode,
	type withAttributes
} from "../base.ts"
import { type BasisKind, type parseBasis } from "../bases/basis.ts"
import {
	type constraintInputsByKind,
	type ConstraintKind
} from "../constraints/constraint.ts"
import { Disjoint } from "../disjoint.ts"
import {
	type DiscriminableSchema,
	type Node,
	type RuleKind,
	type Schema
} from "../nodes.ts"
import { type SetAttachments } from "./set.ts"

export type IntersectionInner = withAttributes<{
	readonly intersection: CollapsedIntersectionInner
}>

export type CollapsedIntersectionInner = readonly Node<RuleKind>[]

export type IntersectionAttachments = extend<
	SetAttachments,
	{
		basis: Node<BasisKind> | undefined
		constraints: readonly Node<ConstraintKind>[]
	}
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	inner: IntersectionInner
	intersections: {
		intersection: "intersection" | Disjoint
		default: "intersection" | Disjoint
	}
	attach: IntersectionAttachments
}>

export const IntersectionImplementation = defineNode({
	kind: "intersection",
	keys: {
		intersection: "children"
	},
	intersections: {
		intersection: (l, r) => {
			let result: CollapsedIntersectionInner | Disjoint = l.intersection
			for (const constraint of r.constraints) {
				if (result instanceof Disjoint) {
					break
				}
				result = addRule(result, constraint)
			}
			return result instanceof Disjoint ? result : { intersection: result }
		},
		default: (l, r) => {
			const result = addRule(l.intersection, r)
			return result instanceof Disjoint ? result : { intersection: result }
		}
	},
	parse: (schema) => {
		const { alias, description, ...rules } = schema
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
		return intersectionInner
	},
	reduce: (inner) => {
		const rules = reduceRules([], inner.intersection)
		if (rules instanceof Disjoint) {
			return rules.throw()
		}
		if (rules.length === 1 && rules[0].isBasis()) {
			// TODO: description?
			return rules[0]
		}
		return { ...inner, union: rules }
	},
	attach: (inner) => {
		let condition = inner.intersection
			.map((rule) => rule.condition)
			.join(") && (")
		if (inner.intersection.length > 1) {
			condition = `(${condition})`
		}
		const basis: Node<BasisKind> | undefined = inner.intersection[0]?.isBasis()
			? inner.intersection[0]
			: undefined
		const constraints: readonly Node<ConstraintKind>[] = basis
			? inner.intersection.slice(1)
			: (inner.intersection as any)
		return {
			basis,
			constraints,
			compile: (cfg) =>
				inner.intersection
					.map(
						(rule) => `if(!(${rule.condition})) {
	return false
}`
					)
					.join("\n") + "\nreturn true"
		}
	},
	writeDefaultDescription: (inner) => {
		return inner.intersection.length === 0
			? "an unknown value"
			: inner.intersection.join(" and ")
	}
})

const reduceRules = (
	l: readonly Node<RuleKind>[],
	r: readonly Node<RuleKind>[]
) => {
	let result: readonly Node<RuleKind>[] | Disjoint = l
	for (const constraint of r) {
		if (result instanceof Disjoint) {
			break
		}
		result = addRule(result, constraint)
	}
	return result instanceof Disjoint ? result : result
}

export const addRule = (
	base: readonly Node<RuleKind>[],
	rule: Node<RuleKind>
): Node<RuleKind>[] | Disjoint => {
	const result: Node<RuleKind>[] = []
	let includesConstraint = false
	for (let i = 0; i < base.length; i++) {
		const elementResult = rule.intersectClosed(base[i])
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
	return result
}

// const assertValidConstraints = (
// 	basis: Node<BasisKind> | undefined,
// 	constraints: readonly Node<ConstraintKind>[]
// ) => {
// 	for (const constraint of constraints) {
// 		if (
// 			!constraint.nodeClass.basis.isUnknown() &&
// 			(!basis || !basis.extends(constraint.nodeClass.basis))
// 		) {
// 			throwParseError(constraint.nodeClass.writeInvalidBasisMessage(basis))
// 		}
// 	}
// }

export type IntersectionBasis = {
	basis?: Schema<BasisKind>
}

export type MappedIntersectionSchema<
	basis extends Schema<BasisKind> | undefined = Schema<BasisKind> | undefined
> = {
	basis?: basis
} & constraintInputsByKind<
	basis extends Schema<BasisKind> ? parseBasis<basis>["infer"] : unknown
> &
	BaseAttributes

export type ListedIntersectionSchema = {
	intersection: RuleSchemaSet
} & BaseAttributes

export type RuleSchemaSet =
	| readonly [Schema<BasisKind>, ...DiscriminableSchema<RuleKind>[]]
	| readonly DiscriminableSchema<"predicate">[]

export type IntersectionSchema =
	| MappedIntersectionSchema
	| ListedIntersectionSchema

type exactBasisMessageOnError<branch, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionSchema<schema> =
	schema extends ListedIntersectionSchema
		? exactMessageOnError<schema, ListedIntersectionSchema>
		: schema extends IntersectionBasis
		? exactBasisMessageOnError<
				schema,
				MappedIntersectionSchema<schema["basis"]>
		  >
		: IntersectionSchema

export type parseIntersectionSchema<schema> =
	schema extends ListedIntersectionSchema
		? schema["intersection"] extends readonly [
				infer basis extends Schema<BasisKind>,
				...infer constraints
		  ]
			? // if there are no constraint elements, reduce to the basis node
			  constraints extends []
				? parseBasis<basis>
				: Node<"intersection", parseBasis<basis>["infer"]>
			: Node<"intersection">
		: schema extends Required<IntersectionBasis>
		? keyof schema & ConstraintKind extends never
			? // if there are no constraint keys, reduce to the basis node
			  parseBasis<schema["basis"]>
			: Node<"intersection", parseBasis<schema["basis"]>["infer"]>
		: Node<"intersection">

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
