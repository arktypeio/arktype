import {
	type conform,
	type ErrorMessage,
	type extend,
	includes,
	type mutable,
	throwInternalError,
	transform
} from "@arktype/util"
import { type BasisKind, type parseBasis } from "../bases/basis.ts"
import {
	type constraintInputsByKind,
	type ConstraintKind
} from "../constraints/constraint.ts"
import type {
	BaseAttributes,
	declareNode,
	Node,
	RuleKind,
	Schema,
	withAttributes
} from "../node.ts"
import {
	basisKinds,
	constraintKinds,
	defineNode,
	type IrreducibleConstraintKind,
	irreducibleConstraintKinds,
	reducibleConstraintKinds
} from "../shared/define.ts"
import { Disjoint } from "../shared/disjoint.ts"
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

export type RuleSet = readonly Node<RuleKind>[]

export type IntersectionAttachments = extend<
	SetAttachments,
	{
		rules: RuleSet
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
		{
			basis: {
				children: basisKinds
			}
		},
		transform(
			constraintKinds,
			([i, kind]) =>
				[
					kind,
					{
						children: [kind]
					}
				] as const
		)
	),
	intersections: {
		intersection: (l, r) => {
			let result: readonly Node<RuleKind>[] | Disjoint = l.rules
			for (const constraint of r.constraints) {
				if (result instanceof Disjoint) {
					break
				}
				result = addRule(result, constraint)
			}
			return result instanceof Disjoint ? result : unflattenRules(result)
		},
		default: (l, r) => {
			const result = addRule(l.rules, r)
			return result instanceof Disjoint ? result : unflattenRules(result)
		}
	},
	reduce: (inner) => {
		const { description, alias, ...rulesByKind } = inner
		const inputRules = Object.values(rulesByKind).flat() as RuleSet
		const reducedRules = reduceRules([], inputRules)
		if (reducedRules instanceof Disjoint) {
			return reducedRules.throw()
		}
		if (reducedRules.length === 1 && reducedRules[0].isBasis()) {
			// TODO: description?
			return reducedRules[0]
		}
		if (reducedRules.length === inputRules.length) {
			return inner
		}
		const reducedRulesByKind = unflattenRules(
			reducedRules
		) as mutable<IntersectionInner>
		if (description) {
			reducedRulesByKind.description = description
		}
		if (alias) {
			reducedRulesByKind.alias = alias
		}
		return reducedRulesByKind
	},
	attach: (node) => {
		const attachments: mutable<IntersectionAttachments, 2> = {
			rules: [],
			constraints: [],
			compile: (cfg) =>
				attachments.rules
					.map(
						(rule) => `if(!(${rule.condition})) {
	return false
}`
					)
					.join("\n") + "\nreturn true"
		}
		for (const [k, v] of node.entries) {
			if (k === "basis") {
				attachments.rules.push(v)
			} else if (includes(constraintKinds, k)) {
				attachments.rules.push(v as never)
				attachments.constraints.push(v as never)
			}
		}
		return attachments
	},
	writeDefaultDescription: (node) => {
		return node.rules.length === 0
			? "an unknown value"
			: node.rules.join(" and ")
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

export const flattenRules = (inner: IntersectionInner): RuleSet =>
	Object.values(inner).flatMap((v) => (typeof v === "object" ? v : []))

export const unflattenRules = (rules: RuleSet): IntersectionInner => {
	const inner: mutable<IntersectionInner> = {}
	for (const rule of rules) {
		if (includes(basisKinds, rule.kind)) {
			inner.basis = rule as Node<BasisKind>
		} else if (includes(irreducibleConstraintKinds, rule.kind)) {
			inner[rule.kind] ??= [] as any
			;(inner as any)[rule.kind].push(rule)
		} else if (includes(reducibleConstraintKinds, rule.kind)) {
			if (inner[rule.kind]) {
				return throwInternalError(
					`Unexpected intersection of reducible constraints of kind ${rule.kind}`
				)
			}
			inner[rule.kind] = rule as never
		}
	}
	return inner
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
		: exactBasisMessageOnError<schema, IntersectionSchema<undefined>>

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
