import {
	append,
	groupBy,
	isArray,
	printable,
	throwInternalError,
	type evaluate,
	type listable,
	type mutable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { instantiateBasis } from "../bases/basis.js"
import type { Prerequisite, Schema, reducibleKindOf } from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type { CompilationContext } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	basisKinds,
	type BasisKind,
	type ClosedIntersectionKind,
	type ConstraintKind,
	type GroupedConstraints,
	type OpenIntersectionKind,
	type PropKind,
	type RefinementKind,
	type kindOrRightward,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import type { ArkTypeError } from "../traversal/errors.js"
import { BaseType } from "../type.js"

export type IntersectionInner = evaluate<
	BaseMeta & { basis?: Node<BasisKind> } & {
		[k in ConditionalIntersectionKey]?: conditionalInnerValueOfKey<k>
	}
>

export type IntersectionSchema<
	basis extends Schema<BasisKind> | undefined = any
> = evaluate<
	BaseMeta & {
		basis?: basis
	} & conditionalSchemaValuesOf<
			basis extends Schema<BasisKind>
				? instantiateBasis<basis>["infer"]
				: unknown
		>
>

export type ConstraintSet = readonly Node<ConstraintKind>[]

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	normalizedSchema: IntersectionSchema
	inner: IntersectionInner
	composition: "composite"
	expectedContext: {
		errors: readonly ArkTypeError[]
	}
	disjoinable: true
	childKind: ConstraintKind
}>

// 	readonly literalKeys = this.named.map((prop) => prop.key.name)
// 	readonly namedKeyOf = cached(() => node.unit(...this.literalKeys))
// 	readonly indexedKeyOf = cached(
// 		() =>
// 			new TypeNode(
// 				this.indexed.flatMap((entry) => entry.key.branches),
// 				this.meta
// 			)
// 	)
// 	readonly keyof = cached(() => this.namedKeyOf().or(this.indexedKeyOf()))

// get(key: string | TypeNode) {
// 	return typeof key === "string"
// 		? this.named.find((entry) => entry.value.branches)?.value
// 		: this.indexed.find((entry) => entry.key.equals(key))?.value
// }

export class IntersectionNode<t = unknown> extends BaseType<
	t,
	IntersectionDeclaration,
	typeof IntersectionNode
> {
	static implementation: nodeImplementationOf<IntersectionDeclaration> =
		this.implement({
			hasAssociatedError: true,
			normalize: (def) => def,
			addParseContext: (ctx) => {
				const def = ctx.definition as IntersectionSchema
				ctx.basis = def.basis && ctx.$.parseTypeNode(def.basis, basisKinds)
			},
			keys: {
				basis: {
					child: true,
					// the basis has already been preparsed and added to context
					parse: (_, ctx) => ctx.basis
				},
				divisor: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("divisor", def, ctx)
				},
				max: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("max", def, ctx)
				},
				min: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("min", def, ctx)
				},
				maxLength: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("maxLength", def, ctx)
				},
				minLength: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("minLength", def, ctx)
				},
				before: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("before", def, ctx)
				},
				after: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("after", def, ctx)
				},
				pattern: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("pattern", def, ctx)
				},
				predicate: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("predicate", def, ctx)
				},
				optional: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("optional", def, ctx)
				},
				required: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("required", def, ctx)
				},
				index: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("index", def, ctx)
				},
				sequence: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("sequence", def, ctx)
				}
			},
			reduce: (inner, scope) => {
				const inputConstraints = flattenConstraints(inner)
				const reducedConstraints = reduceConstraints([], inputConstraints)
				if (reducedConstraints instanceof Disjoint) {
					return reducedConstraints.throw()
				}
				if (
					reducedConstraints.length === 1 &&
					reducedConstraints[0].isBasis()
				) {
					// TODO: description?
					return reducedConstraints[0]
				}
				if (reducedConstraints.length === inputConstraints.length) {
					return
				}
				return scope.parsePrereduced(
					"intersection",
					unflattenConstraints(reducedConstraints)
				)
			},
			defaults: {
				description(inner) {
					const constraints = flattenConstraints(inner)
					return constraints.length === 0
						? "an unknown value"
						: constraints.join(" and ")
				},
				expected(source) {
					return "  • " + source.errors.map((e) => e.expected).join("\n  • ")
				},
				problem(ctx) {
					return `must be...\n${ctx.expected}\n(was ${printable(ctx.data)})`
				}
			}
		})

	readonly constraints: ConstraintSet = flattenConstraints(this.inner)
	readonly groups: GroupedConstraints = groupBy(
		this.constraints,
		"constraintGroup"
	)
	readonly props = this.groups.props
	readonly shallow = this.groups.shallow

	protected intersectOwnInner(r: IntersectionNode) {
		let result: readonly Node<ConstraintKind>[] | Disjoint = this.constraints
		for (const refinement of r.constraints) {
			if (result instanceof Disjoint) {
				break
			}
			result = addConstraint(result, refinement)
		}
		return result instanceof Disjoint ? result : unflattenConstraints(result)
	}

	intersectRightward(
		r: Node<kindOrRightward<"intersection">>
	): IntersectionInner | Disjoint {
		if (r.kind !== "intersection") {
			const result = addConstraint(this.constraints, r)
			return result instanceof Disjoint ? result : unflattenConstraints(result)
		}
		return this.intersectOwnInner(r)
	}

	traverseAllows: TraverseAllows = (data, ctx) => {
		const rejectsData = (constraint: Node<ConstraintKind> | undefined) =>
			constraint?.traverseAllows(data as never, ctx) === false

		if (rejectsData(this.basis)) return false
		if (this.shallow?.some(rejectsData)) return false
		if (this.props?.some(rejectsData)) return false
		if (this.predicate?.some(rejectsData)) return false
		return true
	}

	compileAllows(ctx: CompilationContext) {
		let body = ""
		const compileAndAppend = (constraint: Node<ConstraintKind> | undefined) =>
			constraint &&
			(body += `if(!${constraint.compileAllowsInvocation(ctx)}) return false\n`)

		compileAndAppend(this.basis)
		this.shallow?.forEach(compileAndAppend)
		this.props?.forEach(compileAndAppend)
		this.predicate?.forEach(compileAndAppend)
		body += "return true\n"
		return body
	}

	traverseApply: TraverseApply = (data, ctx) => {
		const groupRejectsData = (
			group: readonly Node<ConstraintKind>[] | undefined
		) => {
			if (group === undefined) {
				return
			}
			for (const node of group) {
				node.traverseApply(data as never, ctx)
			}
			return ctx.currentErrors.length !== 0
		}
		if (groupRejectsData(this.groups.basis)) return
		if (groupRejectsData(this.shallow)) return
		if (groupRejectsData(this.props)) return
		return groupRejectsData(this.predicate)
	}

	compileApply(ctx: CompilationContext) {
		const compiledGroups: string[] = []
		const compileAndAppendGroup = (
			group: readonly Node<ConstraintKind>[] | undefined
		) => {
			if (group === undefined) {
				return
			}
			let compiled = ""
			for (const node of group) {
				compiled += `${node.compileApplyInvocation(ctx)}\n`
			}
			compiledGroups.push(compiled)
		}
		compileAndAppendGroup(this.groups.basis)
		compileAndAppendGroup(this.shallow)
		compileAndAppendGroup(this.props)
		compileAndAppendGroup(this.predicate)
		return compiledGroups.join(
			`\nif(${ctx.ctxArg}.currentErrors.length !== 0) return\n`
		)
	}
}

export type ConditionalConstraintKind = PropKind | RefinementKind

export type KeyBehavior = "loose" | "strict" | "prune"

export type ConditionalTerminalIntersectionInner = {
	// TODO: don't serialize loose
	keys?: KeyBehavior
}

type ConditionalTerminalIntersectionKey =
	keyof ConditionalTerminalIntersectionInner

type conditionalChildKindOf<t> = {
	[k in ConditionalConstraintKind]: t extends Prerequisite<k> ? k : never
}[ConditionalConstraintKind]

export type ConditionalIntersectionKey =
	| ConditionalConstraintKind
	| keyof ConditionalTerminalIntersectionInner

export type conditionalIntersectionKeyOf<t> =
	| conditionalChildKindOf<t>
	| (t extends object ? "keys" : never)

type conditionalSchemaValueOfKey<k extends ConditionalIntersectionKey> =
	k extends OpenIntersectionKind
		? listable<Schema<k>>
		: k extends ClosedIntersectionKind
		? Schema<k>
		: ConditionalTerminalIntersectionInner[k &
				ConditionalTerminalIntersectionKey]

type conditionalInnerValueOfKey<k extends ConditionalIntersectionKey> =
	k extends OpenIntersectionKind
		? readonly Node<k>[]
		: k extends ClosedIntersectionKind
		? Node<k>
		: ConditionalTerminalIntersectionInner[k &
				ConditionalTerminalIntersectionKey]

export type conditionalSchemaValuesOf<t> = {
	[k in conditionalChildKindOf<t>]?: conditionalSchemaValueOfKey<k>
}

export const parseClosedComponent = <kind extends ClosedIntersectionKind>(
	kind: kind,
	input: Schema<kind>,
	ctx: SchemaParseContext
): Node<kind> => {
	const refinement = ctx.$.parseNode(
		kind,
		input
	) as Node<ConditionalConstraintKind>
	refinement.assertValidBasis(ctx.basis)
	return refinement as never
}

export const parseOpenComponent = <kind extends OpenIntersectionKind>(
	kind: kind,
	input: listable<Schema<kind>>,
	ctx: SchemaParseContext
): readonly Node<reducibleKindOf<kind>>[] | undefined => {
	if (isArray(input)) {
		if (input.length === 0) {
			// Omit empty lists as input
			return
		}
		const refinements = input
			.map((refinement) => ctx.$.parseNode(kind, refinement))
			.sort((l, r) => (l.innerId < r.innerId ? -1 : 1))
		// we should only need to assert validity for one, as all listed
		// refinements should be of the same kind and therefore have the same
		// operand requirements
		refinements[0].assertValidBasis(ctx.basis)
		return refinements
	}
	const refinement = ctx.$.parseNode(kind, input)
	refinement.assertValidBasis(ctx.basis)
	return [refinement]
}

const reduceConstraints = (
	l: readonly Node<ConstraintKind>[],
	r: readonly Node<ConstraintKind>[]
) => {
	let result: readonly Node<ConstraintKind>[] | Disjoint = l
	for (const refinement of r) {
		if (result instanceof Disjoint) {
			break
		}
		result = addConstraint(result, refinement)
	}
	return result instanceof Disjoint ? result : result
}

const flattenedConstraintCache = new Map<IntersectionInner, ConstraintSet>()
const flattenConstraints = (inner: IntersectionInner): ConstraintSet => {
	const cachedResult = flattenedConstraintCache.get(inner)
	if (cachedResult) {
		return cachedResult
	}
	const result = Object.entries(inner).flatMap(([k, v]) =>
		k === "description" ? [] : (v as listable<Node<ConstraintKind>>)
	)
	flattenedConstraintCache.set(inner, result)
	return result
}

const unflattenConstraints = (
	constraints: ConstraintSet
): IntersectionInner => {
	const inner: mutable<IntersectionInner> = {}
	for (const constraint of constraints) {
		if (constraint.isBasis()) {
			inner.basis = constraint
		} else if (constraint.hasOpenIntersection) {
			append((inner as any)[constraint.kind], constraint)
		} else {
			if (inner[constraint.kind]) {
				return throwInternalError(
					`Unexpected intersection of closed refinements of kind ${constraint.kind}`
				)
			}
			inner[constraint.kind] = constraint as never
		}
	}
	return inner
}

export const addConstraint = (
	base: readonly Node<ConstraintKind>[],
	constraint: Node<ConstraintKind>
): Node<ConstraintKind>[] | Disjoint => {
	const result: Node<ConstraintKind>[] = []
	let includesComponent = false
	for (let i = 0; i < base.length; i++) {
		const elementResult = constraint.intersectClosed(base[i])
		if (elementResult === null) {
			result.push(base[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesComponent) {
			result.push(elementResult)
			includesComponent = true
		} else if (!result.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for refinement ${elementResult}`
			)
		}
	}
	if (!includesComponent) {
		result.push(constraint)
	}
	return result
}
