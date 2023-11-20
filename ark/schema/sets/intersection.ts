import {
	includes,
	isArray,
	throwInternalError,
	type ErrorMessage,
	type conform,
	type extend,
	type listable,
	type mutable
} from "@arktype/util"
import {
	getBasisKindOrThrow,
	type BasisKind,
	type parseBasis
} from "../bases/basis.ts"
import type { constraintInputsByKind } from "../constraints/constraint.ts"
import type { SchemaParseContext, UnknownNode } from "../node.ts"
import type {
	BaseAttributes,
	declareNode,
	withAttributes
} from "../shared/declare.ts"
import {
	constraintKinds,
	defineNode,
	type ClosedConstraintKind,
	type ConstraintKind,
	type OpenConstraintKind,
	type RuleKind
} from "../shared/define.ts"
import { Disjoint } from "../shared/disjoint.ts"
import type { Node, Schema } from "../shared/node.ts"
import type { SetAttachments } from "./set.ts"

export type IntersectionInner = withAttributes<
	{ basis?: Node<BasisKind> } & {
		[k in ConstraintKind]?: k extends OpenConstraintKind
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
	keys: {
		basis: {
			precedence: -1,
			parse: (schema, ctx) => {
				if (schema === undefined) {
					return undefined
				}
				const basisKind = getBasisKindOrThrow(schema)
				return ctx.cls.parseSchema(basisKind, schema, {})
			}
		},
		divisor: {
			parse: (schema, ctx) => parseClosedConstraint("divisor", schema, ctx)
		},
		max: {
			parse: (schema, ctx) => parseClosedConstraint("max", schema, ctx)
		},
		min: {
			parse: (schema, ctx) => parseClosedConstraint("min", schema, ctx)
		},
		pattern: {
			parse: (schema, ctx) => parseOpenConstraint("pattern", schema, ctx)
		},
		predicate: {
			parse: (schema, ctx) => parseOpenConstraint("predicate", schema, ctx)
		},
		optional: {
			parse: (schema, ctx) => parseOpenConstraint("optional", schema, ctx)
		},
		required: {
			parse: (schema, ctx) => parseOpenConstraint("required", schema, ctx)
		}
	},
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
	reduce: (inner, ctx) => {
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
			return
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
		return ctx.cls.parsePrereduced("intersection", reducedRulesByKind)
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

export const parseClosedConstraint = <kind extends ClosedConstraintKind>(
	kind: kind,
	input: Schema<kind>,
	intersectionContext: SchemaParseContext<"intersection">
) => {
	const childContext = { basis: intersectionContext.inner?.basis }
	return intersectionContext.cls.parseSchema(kind, input, childContext)
}

export const parseOpenConstraint = <kind extends OpenConstraintKind>(
	kind: kind,
	input: listable<Schema<kind>>,
	intersectionContext: SchemaParseContext<"intersection">
) => {
	const childContext = { basis: intersectionContext.inner?.basis }
	if (isArray(input)) {
		if (input.length === 0) {
			// Omit empty lists as input
			return
		}
		return input
			.map((constraint) =>
				intersectionContext.cls.parseSchema(kind, constraint, childContext)
			)
			.sort((l, r) => (l.id < r.id ? -1 : 1))
	}
	return [intersectionContext.cls.parseSchema(kind, input, childContext)]
}

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
	Object.values(inner).flatMap((v) =>
		typeof v === "object" ? (v as UnknownNode) : []
	)

export const unflattenRules = (rules: RuleSet): IntersectionInner => {
	const inner: mutable<IntersectionInner> = {}
	for (const rule of rules) {
		if (rule.isBasis()) {
			inner.basis = rule
		} else if (rule.isOpenConstraint()) {
			inner[rule.kind] ??= [] as any
			;(inner as any)[rule.kind].push(rule)
		} else if (rule.isClosedConstraint()) {
			if (inner[rule.kind]) {
				return throwInternalError(
					`Unexpected intersection of closed constraints of kind ${rule.kind}`
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
