import type { conform, ErrorMessage, extend, mutable } from "@arktype/util"
import { throwInternalError, transform } from "@arktype/util"
import {
	type BaseAttributes,
	constraintKinds,
	type declareNode,
	defineNode,
	type IrreducibleConstraintKind,
	type withAttributes
} from "../base.ts"
import { type BasisKind, type parseBasis } from "../bases/basis.ts"
import {
	type constraintInputsByKind,
	type ConstraintKind
} from "../constraints/constraint.ts"
import { Disjoint } from "../disjoint.ts"
import { type Node, type RuleKind, type Schema } from "../nodes.ts"
import { type SetAttachments } from "./set.ts"

export type IntersectionInner = withAttributes<
	{ basis?: Node<BasisKind> } & {
		[k in ConstraintKind]?: k extends IrreducibleConstraintKind
			? readonly Node<k>[]
			: Node<k>
	}
>

export type IntersectionSchema<
	basis extends Schema<BasisKind> | undefined = Schema<BasisKind> | undefined
> = {
	basis?: basis
} & constraintInputsByKind<
	basis extends Schema<BasisKind> ? parseBasis<basis>["infer"] : unknown
> &
	BaseAttributes

export type IntersectionAttachments = extend<
	SetAttachments,
	{
		basis: Node<BasisKind> | undefined
		constraints: readonly Node<ConstraintKind>[]
	}
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	expandedSchema: IntersectionSchema
	inner: IntersectionInner
	intersections: {
		intersection: "intersection" | Disjoint
		default: "intersection" | Disjoint
	}
	attach: IntersectionAttachments
}>

export const IntersectionImplementation = defineNode({
	kind: "intersection",
	keys: Object.assign(
		{ basis: "leaf" as const },
		transform(constraintKinds, ([i, kind]) => [kind, "leaf"] as const)
	),
	intersections: {
		intersection: (l, r) => {
			let result: Node<RuleKind>[] | Disjoint = l.intersection
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

type exactBasisMessageOnError<branch, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionSchema<schema> =
	schema extends IntersectionBasis
		? exactBasisMessageOnError<schema, IntersectionSchema<schema["basis"]>>
		: IntersectionSchema<undefined>

export type parseIntersectionSchema<schema> =
	schema extends Required<IntersectionBasis>
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
