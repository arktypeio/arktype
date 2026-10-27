import { hasDomain, type array, type JsonObject } from "@ark/util"
import type { nodeOfKind } from "../kinds.ts"
import type { RangeKind } from "../refinements/kinds.ts"
import type { LimitKind } from "../refinements/range.ts"
import type { PredicateNode } from "../predicate.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import type { ArkError } from "../shared/errors.ts"
import {
	implementNode,
	type nodeImplementationOf,
	type OpenNodeKind,
	type PrestructuralKind,
	type RefinementKind,
	type StructuralKind
} from "../shared/implement.ts"
import {
	allowsInBranch,
	transform,
	type AliasDepth,
	type InternalTraversal
} from "../shared/traversal.ts"
import {
	composing,
	type makeRootAndArrayPropertiesMutable
} from "../shared/utils.ts"
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
		errorCtx: ErrorContext
		childKind: ChildKind
	}>

	export type Node = IntersectionNode
}

const implementation: nodeImplementationOf<Intersection.Declaration> =
	implementNode<Intersection.Declaration>({
		kind: "intersection",
		ownErr: true,
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
					if (!node.sequence?.minLength) return node.bareJson
					const { sequence, ...structureJson } = node.bareJson as any
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
			notEqual: {
				child: true
			},
			notEqualLength: {
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
				const preStruct = writtenPrestructuralsOf(node)
				const childDescriptions: string[] = []

				if (
					basis &&
					!node.preStruct.some(r => r.impl.coversNoun) &&
					// a keyword's predicate, like string.url's, names its basis
					!(
						!node.structure &&
						node.inner.predicate?.some(p => p.meta.keyword !== undefined)
					)
				)
					childDescriptions.push(basis.description)

				if (preStruct.length) {
					const sortedRefinementDescriptions = preStruct
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

				for (const p of node.inner.predicate ?? []) {
					// a keyword can constrain its basis twice with one phrase, like
					// string.creditCard's pattern and predicate. A narrow's phrase
					// names its function, which a precompiled build reads at runtime,
					// so two narrows are always both described
					if (
						p.meta.description === undefined ||
						!childDescriptions.includes(p.description)
					)
						childDescriptions.push(p.description)
				}

				return childDescriptions.join(" and ")
			}
		}
	})

export class IntersectionNode extends BaseRoot<Intersection.Declaration> {
	basis: nodeOfKind<Intersection.BasisKind> | null =
		this.inner.domain ?? this.inner.proto ?? null

	// children are ordered by kind: basis, preStruct, structure, predicates
	refinements: array<nodeOfKind<RefinementKind>> = this.children.slice(
		this.basis ? 1 : 0
	) as never

	/** its refinements checked before its structure */
	preStruct: array<nodeOfKind<PrestructuralKind>> = this.refinements.slice(
		0,
		this.refinements.length -
			(this.inner.structure ? 1 : 0) -
			(this.inner.predicate?.length ?? 0)
	) as never

	structure: Structure.Node | undefined = this.inner.structure

	get expression(): string {
		return (this.cache.expression ??= composing(() =>
			writeIntersectionExpression(this)
		))
	}

	get nestedExpr(): string {
		// an expression written by a single child is already nestable
		return (
				this.expression === "unknown" ||
					this.expression === "[]" ||
					this.children.some(child => child.nestedExpr === this.expression)
			) ?
				this.expression
			:	`(${this.expression})`
	}

	get topMorphs(): array<Morph> {
		return this.inner.structure?.structMorph ?
				[this.inner.structure.structMorph]
			:	[]
	}

	get brief(): string {
		return this.basis?.brief ?? "present"
	}

	traverseAllows(data: unknown, ctx: InternalTraversal | AliasDepth): boolean {
		return this.children.every(child =>
			child.traverseAllows(data as never, ctx)
		)
	}

	traverseApply(data: unknown, ctx: InternalTraversal): void {
		const errorCount = ctx.errCount
		if (this.basis) {
			this.basis.traverseApply(data, ctx)
			if (ctx.errCount > errorCount) return
		}
		if (this.preStruct.length) {
			for (let i = 0; i < this.preStruct.length - 1; i++) {
				this.preStruct[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.errCount > errorCount) return
			}
			this.preStruct[this.preStruct.length - 1]!.traverseApply(
				data as never,
				ctx
			)
			if (ctx.errCount > errorCount) return
		}
		if (this.structure) {
			// transformed only if the predicates allow it
			if (this.inner.predicate && this.structure.transforms) {
				if (!allowsInBranch(ctx, this.structure, data)) {
					this.structure.traverseApply(data as never, ctx)
					return
				}
			} else {
				this.structure.traverseApply(data as never, ctx)
				if (ctx.errCount > errorCount) return
			}
		}
		if (this.inner.predicate) {
			for (let i = 0; i < this.inner.predicate.length - 1; i++) {
				this.inner.predicate[i].traverseApply(data as never, ctx)
				if (ctx.errCount > errorCount) return
			}
			this.inner.predicate[this.inner.predicate.length - 1]!.traverseApply(
				data as never,
				ctx
			)
		}
	}

	traverseTransform(data: unknown, ctx: InternalTraversal): unknown {
		return transform(ctx, this.structure!, data)
	}

	// a structure checking only elements, as an array's does, is written into
	// this node's traversals as its sequence's loop rather than called, unless
	// the elements recurse through an alias, which V8 runs faster as a call
	private get inlinedSequence(): nodeOfKind<"sequence"> | undefined {
		const structure = this.structure
		if (
			structure?.sequence &&
			!this.inner.predicate &&
			!this.transforms &&
			!structure.sequence.hasAlias &&
			Object.keys(structure.inner).length === 1
		)
			return structure.sequence
	}

	// a failed basis or prestructural stops this node's Apply
	compile(js: NodeCompiler): void {
		if (js.trav === "Allows") {
			const read =
				this.inner.domain?.domain === "object" && !this.preStruct.length ?
					this.structure?.allowsProps[0]
				:	undefined
			// a key is read before data is checked to be an object, in a switch
			// rejecting what none can be read from. The checks are one condition
			// in its block, where a minifier keeps them apart from the returns
			if (read && !js.shortest) {
				js.block("switch (data)", () =>
					js
						.line("case null: case undefined: break")
						.line("default:")
						.line(`data${js.prop(read.key)}`)
						.if(
							this.children
								.map(child =>
									child === this.basis ?
										objectCondition
									:	`(${js.condition(child)})`
								)
								.join(" && "),
							() => js.return(true)
						)
				).return(js.rejection(this))
				return
			}
			const sequence = this.inlinedSequence
			const checks = () => {
				for (const child of this.children) {
					// the last child, returning true once each element is allowed
					if (child === this.structure && sequence) {
						sequence.compile(js)
						return js
					}
					if (child !== this.basis || !read)
						js.check(child, { breaks: !js.shortest })
					else {
						js.rejectNullish(this)
							.line(`data${js.prop(read.key)}`)
							.if(`!${objectCondition}`, () => js.return(false))
					}
				}
				return js.return(true)
			}
			const rejection = js.rejection(this)
			// a loop keeps a minifier from joining its checks into one expression,
			// which a build for size lets it do, as does a node of leaf checks
			// reading no key, whose caller tests what it returns. A check calling
			// another node keeps the loop, which V8 runs faster
			if (js.shortest) checks()
			else if (
				!sequence &&
				rejection === "false" &&
				this.children.every(child => child.compileCondition !== undefined)
			) {
				js.return(
					this.children.map(child => `(${js.condition(child)})`).join(" && ") ||
						"true"
				)
			} else js.block("for (;;)", checks).return(rejection)
			return
		}
		// only a structure can transform an intersection's data
		if (js.trav === "Transform") {
			js.return(js.invoke(this.structure!))
			return
		}

		const { basis, preStruct, structure } = this
		const predicates = this.inner.predicate
		if (basis) {
			const condition = basis.compileCondition(js, "data")
			if (this.children.length === 1) {
				js.return(`${condition} || !${js.error(basis)}`)
				return
			}
			js.if(`!(${condition})`, () => js.return(`!${js.error(basis)}`))
		}
		if (!structure && !predicates) {
			for (const node of preStruct) js.check(node)
			js.return(true)
			return
		}
		const conditions = preStruct.map(node => node.compileCondition(js, "data"))
		if (conditions.length === 1) {
			js.if(`!(${conditions[0]})`, () =>
				js.return(`!${js.error(preStruct[0])}`)
			)
		} else if (conditions.length) {
			js.if(`!(${conditions.map(c => `(${c})`).join(" && ")})`, () =>
				js.return(
					`!(${conditions.map((c, i) => `(!(${c}) && ${js.error(preStruct[i])})`).join(" || ")})`
				)
			)
		}
		if (!predicates) {
			const sequence = this.inlinedSequence
			if (sequence) sequence.compile(js)
			else js.return(js.invoke(structure!))
			return
		}
		// read only where a later check follows one that can add issues
		if ((structure && !structure.transforms) || predicates.length > 1)
			js.initErrCount()
		if (structure) {
			// transformed only if the predicates allow it
			if (structure.transforms)
				js.if(`!${js.allows(structure)}`, () => js.return(js.invoke(structure)))
			else {
				js.if(`!${js.invoke(structure)}`, () => js.return(false)).if(
					"ctx.errCount > errorCount",
					() => js.return(true)
				)
			}
		}
		// since predicates can be chained, the first to fail stops this node
		for (const predicate of predicates.slice(0, -1)) {
			js.if(`!${js.invoke(predicate)}`, () => js.return(false)).if(
				"ctx.errCount > errorCount",
				() => js.return(true)
			)
		}
		js.return(js.invoke(predicates[predicates.length - 1]))
	}
}

// whether data is an object, which V8 folds once a read of its key has
// checked its map
const objectCondition = "(data instanceof Object || Object(data) === data)"

export const Intersection = {
	impl: implementation,
	Node: IntersectionNode
}

const writeIntersectionExpression = (node: Intersection.Node) => {
	const basis = writtenBasisOf(node)
	// an operand has at most one right comparator, so a != past the first is
	// written as an operand of its own, as in `number > 0 & number != 5`
	let preStruct = writtenPrestructuralsOf(node)
	let excluded = preStruct.filter(isNotEqual)
	if (excluded.length) {
		preStruct = preStruct.filter(n => !isNotEqual(n))
		if (!preStruct.some(isComparator)) {
			preStruct = [...preStruct, excluded[0]]
			excluded = excluded.slice(1)
		}
	}

	const basisExpression =
		basis && !node.preStruct.some(n => n.impl.coversExpr) ?
			basis.nestedExpr
		:	""

	// a range is written as it's parsed, e.g. `1 <= number <= 5`
	const upper = preStruct.find(n => isLimit(n, "upper"))
	const lower = upper && preStruct.find(n => isLimit(n, "lower"))

	// a pattern is an operand of its own, and other refinements follow theirs
	const refinementsExpression = preStruct
		.filter(n => !lower || (n !== lower && n !== upper))
		.map(
			(n, i) =>
				(i === 0 ? ""
				: n.kind === "pattern" ? " & "
				: " ") + n.expression
		)
		.join("")

	const fullExpression =
		basisExpression === "Array" && refinementsExpression === "== 0" ?
			"[]"
		:	`${basisExpression}${basisExpression && refinementsExpression ? " " : ""}${refinementsExpression}`

	let expression =
		node.structure ?
			fullExpression ?
				`${node.structure.expression}${basis ? " & " : " "}${fullExpression}`
			:	node.structure.expression
		:	fullExpression || "unknown"

	if (lower) {
		const limit = lower.expression.slice(lower.comparator.length + 1)
		// what it bounds is grouped if it intersects patterns
		const operand = expression.includes(" & ") ? `(${expression})` : expression
		expression = `${limit} ${lower.comparator === ">" ? "<" : "<="} ${operand} ${upper.expression}`
	}

	// a case a union discriminates by domain has no basis of its own
	for (const n of excluded)
		expression += ` & ${(node.basis ?? n.implied).nestedExpr} ${n.expression}`

	return expression
}

const isNotEqual = (node: nodeOfKind<PrestructuralKind>) =>
	node.kind === "notEqual" || node.kind === "notEqualLength"

const isComparator = (node: nodeOfKind<PrestructuralKind>) =>
	node.kind !== "pattern" && node.kind !== "divisor"

const isLimit = (
	node: nodeOfKind<PrestructuralKind>,
	limitKind: LimitKind
): node is nodeOfKind<RangeKind> =>
	"limitKind" in node && node.limitKind === limitKind

const writtenBasisOf = (node: Intersection.Node) =>
	(
		node.structure &&
		node.basis?.equals(
			node.structure.sequence?.implied ?? node.structure.implied
		)
	) ?
		null
	:	node.basis

const writtenPrestructuralsOf = (node: Intersection.Node) => {
	const sequence = node.structure?.sequence
	if (!sequence) return node.preStruct
	// minVariadicLength is excluded since it isn't reflected in the intersection's id
	const impliedMinLength = sequence.preLen + sequence.postLen
	return node.preStruct.filter(n =>
		n.kind === "minLength" ? n.rule !== impliedMinLength
		: n.kind === "maxLength" ? n.rule !== sequence.maxLength
		: n.kind !== "exactLength" || impliedMinLength !== sequence.maxLength
	)
}

type intersectionChildInnerValueOf<k extends Intersection.FlattenedChildKind> =
	k extends OpenNodeKind ? readonly nodeOfKind<k>[] : nodeOfKind<k>
