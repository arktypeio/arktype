import { hasDomain, includes, type array, type JsonObject } from "@ark/util"
import type { nodeOfKind } from "../kinds.ts"
import type { PredicateNode } from "../predicate.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import type { ArkError } from "../shared/errors.ts"
import {
	implementNode,
	prestructuralKinds,
	type nodeImplementationOf,
	type OpenNodeKind,
	type PrestructuralKind,
	type RefinementKind,
	type StructuralKind
} from "../shared/implement.ts"
import type {
	TraverseAllows,
	TraverseApply,
	TraverseTransform
} from "../shared/traversal.ts"
import type { makeRootAndArrayPropertiesMutable } from "../shared/utils.ts"
import type { Structure } from "../structure/structure.ts"
import type { Domain } from "./domain.ts"
import type { Morph } from "./morph.ts"
import type { Proto } from "./proto.ts"
import { BaseRoot } from "./root.ts"

export declare namespace Intersection {
	export type BasisKind = "domain" | "proto"

	export type ChildKind = BasisKind | RefinementKind

	export type FlattenedChildKind = ChildKind | StructuralKind

	export type RefinementsInner = {
		[k in RefinementKind]?: intersectionChildInnerValueOf<k>
	}

	export interface Inner extends RefinementsInner {
		domain?: Domain.Node
		proto?: Proto.Node
		structure?: Structure.Node
		predicate?: array<PredicateNode>
	}

	export namespace Inner {
		export type mutable = makeRootAndArrayPropertiesMutable<Inner>
	}

	export interface ErrorContext
		extends BaseErrorContext<"intersection">,
			Inner {
		errors: readonly ArkError[]
	}

	export type Declaration = declareNode<{
		kind: "intersection"
		inner: Inner
		reducibleTo: "intersection" | BasisKind
		errorContext: ErrorContext
		childKind: ChildKind
	}>

	export type Node = IntersectionNode
}

const implementation: nodeImplementationOf<Intersection.Declaration> =
	implementNode<Intersection.Declaration>({
		kind: "intersection",
		hasAssociatedError: true,
		finalizeInnerJson: ({ structure, ...rest }) =>
			hasDomain(structure, "object") ? { ...structure, ...rest } : rest,
		keys: {
			domain: {
				child: true
			},
			proto: {
				child: true
			},
			structure: {
				child: true,
				serialize: node => {
					if (!node.sequence?.minLength) return node.collapsibleJson
					const { sequence, ...structureJson } = node.collapsibleJson as any
					const { minVariadicLength, ...sequenceJson } = sequence as JsonObject
					const collapsibleSequenceJson =
						sequenceJson.variadic && Object.keys(sequenceJson).length === 1 ?
							sequenceJson.variadic
						:	sequenceJson
					return { ...structureJson, sequence: collapsibleSequenceJson }
				}
			},
			divisor: {
				child: true
			},
			max: {
				child: true
			},
			min: {
				child: true
			},
			maxLength: {
				child: true
			},
			minLength: {
				child: true
			},
			exactLength: {
				child: true
			},
			before: {
				child: true
			},
			after: {
				child: true
			},
			pattern: {
				child: true
			},
			predicate: {
				child: true
			}
		},
		defaults: {
			description: node => {
				if (node.children.length === 0) return "unknown"

				const basis = writtenBasisOf(node)
				const prestructurals = writtenPrestructuralsOf(node)
				const childDescriptions: string[] = []

				if (
					basis &&
					!node.prestructurals.some(r => r.impl.obviatesBasisDescription)
				)
					childDescriptions.push(basis.description)

				if (prestructurals.length) {
					const sortedRefinementDescriptions = prestructurals
						.slice()
						// override alphabetization to describe min before max
						.sort((l, r) =>
							l.kind === "min" && r.kind === "max" ? -1
							: l.kind === "max" && r.kind === "min" ? 1
							: 0
						)
						.map(r => r.description)
					childDescriptions.push(...sortedRefinementDescriptions)
				}

				if (node.structure) {
					return childDescriptions.length ?
							`${node.structure.description}${basis ? " & " : " "}${childDescriptions.join(" and ")}`
						:	node.structure.description
				}

				if (node.inner.predicate) {
					childDescriptions.push(
						...node.inner.predicate.map(p => p.description)
					)
				}

				return childDescriptions.join(" and ")
			}
		}
	})

export class IntersectionNode extends BaseRoot<Intersection.Declaration> {
	basis: nodeOfKind<Intersection.BasisKind> | null =
		this.inner.domain ?? this.inner.proto ?? null

	prestructurals: array<nodeOfKind<PrestructuralKind>> = []

	refinements: array<nodeOfKind<RefinementKind>> = this.children.filter(
		(node): node is never => {
			if (!node.isRefinement()) return false
			if (includes(prestructuralKinds, node.kind))
				// mutation is fine during initialization
				(this.prestructurals as unknown[]).push(node)
			return true
		}
	)

	structure: Structure.Node | undefined = this.inner.structure

	expression: string = writeIntersectionExpression(this)

	get nestableExpression(): string {
		// an expression written by a single child is already nestable
		return (
				this.expression === "unknown" ||
					this.expression === "[]" ||
					this.children.some(
						child => child.nestableExpression === this.expression
					)
			) ?
				this.expression
			:	`(${this.expression})`
	}

	get shallowMorphs(): array<Morph> {
		return this.inner.structure?.structuralMorph ?
				[this.inner.structure.structuralMorph]
			:	[]
	}

	get defaultShortDescription(): string {
		return this.basis?.defaultShortDescription ?? "present"
	}

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.children.every(child => child.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply = (data, ctx) => {
		const errorCount = ctx.currentErrorCount
		if (this.basis) {
			this.basis.traverseApply(data, ctx)
			if (ctx.currentErrorCount > errorCount) return
		}
		if (this.prestructurals.length) {
			for (let i = 0; i < this.prestructurals.length - 1; i++) {
				this.prestructurals[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.currentErrorCount > errorCount) return
			}
			this.prestructurals[this.prestructurals.length - 1]!.traverseApply(
				data as never,
				ctx
			)
			if (ctx.currentErrorCount > errorCount) return
		}
		if (this.structure) {
			// Apply transforms what it finds valid, which a predicate could still reject
			if (this.inner.predicate && this.structure.transforms) {
				if (!ctx.allows(this.structure, data)) {
					this.structure.traverseApply(data as never, ctx)
					return
				}
			} else {
				this.structure.traverseApply(data as never, ctx)
				if (ctx.currentErrorCount > errorCount) return
			}
		}
		if (this.inner.predicate) {
			for (let i = 0; i < this.inner.predicate.length - 1; i++) {
				this.inner.predicate[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.currentErrorCount > errorCount) return
			}
			this.inner.predicate[this.inner.predicate.length - 1]!.traverseApply(
				data as never,
				ctx
			)
		}
	}

	traverseTransform: TraverseTransform = (data, ctx) =>
		ctx.transform(this.structure!, data)

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			for (const child of this.children) js.check(child)
			js.return(true)
			return
		}
		// only a structure can transform an intersection's data
		if (js.traversalKind === "Transform") {
			js.return(js.invoke(this.structure!))
			return
		}

		js.initializeErrorCount()

		if (this.basis) {
			js.check(this.basis)
			// we only have to return conditionally if this is not the last check
			if (this.children.length > 1) js.returnIfFail()
		}
		if (this.prestructurals.length) {
			for (let i = 0; i < this.prestructurals.length - 1; i++) {
				js.check(this.prestructurals[i])
				js.returnIfFailFast()
			}
			js.check(this.prestructurals[this.prestructurals.length - 1]!)
			if (this.structure || this.inner.predicate) js.returnIfFail()
		}
		if (this.structure) {
			const structure = this.structure
			// Apply transforms what it finds valid, which a predicate could still reject
			if (this.inner.predicate && structure.transforms)
				js.if(`!${js.allows(structure)}`, () => js.check(structure).return())
			else {
				js.check(structure)
				if (this.inner.predicate) js.returnIfFail()
			}
		}
		if (this.inner.predicate) {
			for (let i = 0; i < this.inner.predicate.length - 1; i++) {
				js.check(this.inner.predicate[i])
				// since predicates can be chained, we have to fail immediately
				// if one fails
				js.returnIfFail()
			}
			js.check(this.inner.predicate[this.inner.predicate.length - 1]!)
		}
	}
}

export const Intersection = {
	implementation,
	Node: IntersectionNode
}

const writeIntersectionExpression = (node: Intersection.Node) => {
	const basis = writtenBasisOf(node)

	const basisExpression =
		basis && !node.prestructurals.some(n => n.impl.obviatesBasisExpression) ?
			basis.nestableExpression
		:	""

	const refinementsExpression = writtenPrestructuralsOf(node)
		.map(n => n.expression)
		.join(" & ")

	const fullExpression =
		basisExpression === "Array" && refinementsExpression === "== 0" ?
			"[]"
		:	`${basisExpression}${basisExpression && refinementsExpression ? " " : ""}${refinementsExpression}`

	if (node.structure) {
		return fullExpression ?
				`${node.structure.expression}${basis ? " & " : " "}${fullExpression}`
			:	node.structure.expression
	}

	return fullExpression || "unknown"
}

const writtenBasisOf = (node: Intersection.Node) =>
	(
		node.structure &&
		node.basis?.equals(
			node.structure.sequence?.impliedBasis ?? node.structure.impliedBasis
		)
	) ?
		null
	:	node.basis

const writtenPrestructuralsOf = (node: Intersection.Node) => {
	const sequence = node.structure?.sequence
	if (!sequence) return node.prestructurals
	// minVariadicLength is excluded since it isn't reflected in the intersection's id
	const impliedMinLength = sequence.prefixLength + sequence.postfixLength
	return node.prestructurals.filter(n =>
		n.kind === "minLength" ? n.rule !== impliedMinLength
		: n.kind === "maxLength" ? n.rule !== sequence.maxLength
		: n.kind !== "exactLength" || impliedMinLength !== sequence.maxLength
	)
}

type intersectionChildInnerValueOf<k extends Intersection.FlattenedChildKind> =
	k extends OpenNodeKind ? readonly nodeOfKind<k>[] : nodeOfKind<k>
