import {
	appendUnique,
	cached,
	compileLiteralPropAccess,
	compileSerializedValue,
	entriesOf,
	flatMorph,
	groupBy,
	isArray,
	isKeyOf,
	throwInternalError,
	type Domain,
	type SerializedPrimitive,
	type array,
	type keySet,
	type show
} from "@arktype/util"
import type { Node, NodeSchema } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint, type SerializedPath } from "../shared/disjoint.js"
import type { ArkError } from "../shared/errors.js"
import {
	implementNode,
	schemaKindsRightOf,
	type IntersectionContext,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes, intersectNodesRoot } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import type { DomainNode } from "./domain.js"
import { BaseRoot, type schemaKindRightOf } from "./root.js"
import type { UnitNode } from "./unit.js"
import { defineRightwardIntersections } from "./utils.js"

export type UnionChildKind = schemaKindRightOf<"union"> | "alias"

const unionChildKinds: array<UnionChildKind> = [
	...schemaKindsRightOf("union"),
	"alias"
]

export type UnionChildSchema = NodeSchema<UnionChildKind>

export type UnionChildNode = Node<UnionChildKind>

export type UnionSchema<
	branches extends readonly UnionChildSchema[] = readonly UnionChildSchema[]
> = NormalizedUnionSchema<branches> | branches

export interface NormalizedUnionSchema<
	branches extends readonly UnionChildSchema[] = readonly UnionChildSchema[]
> extends BaseMeta {
	readonly branches: branches
	readonly ordered?: true
}

export interface UnionInner extends BaseMeta {
	readonly branches: readonly UnionChildNode[]
	readonly ordered?: true
}

export interface UnionDeclaration
	extends declareNode<{
		kind: "union"
		schema: UnionSchema
		normalizedSchema: NormalizedUnionSchema
		inner: UnionInner
		errorContext: {
			errors: readonly ArkError[]
		}
		reducibleTo: RootKind
		childKind: UnionChildKind
	}> {}

export const unionImplementation: nodeImplementationOf<UnionDeclaration> =
	implementNode<UnionDeclaration>({
		kind: "union",
		hasAssociatedError: true,
		collapsibleKey: "branches",
		keys: {
			ordered: {},
			branches: {
				child: true,
				parse: (schema, ctx) => {
					const branches = schema.map(branch =>
						ctx.$.node(unionChildKinds, branch)
					)

					if (!ctx.schema.ordered)
						branches.sort((l, r) => (l.innerHash < r.innerHash ? -1 : 1))

					return branches
				}
			}
		},
		normalize: schema => (isArray(schema) ? { branches: schema } : schema),
		reduce: (inner, $) => {
			const reducedBranches = reduceBranches(inner)
			if (reducedBranches.length === 1) return reducedBranches[0]

			if (reducedBranches.length === inner.branches.length) return

			return $.node(
				"union",
				{
					...inner,
					branches: reducedBranches
				},
				{ prereduced: true }
			)
		},
		defaults: {
			description: node =>
				describeBranches(node.branches.map(branch => branch.description)),
			expected: ctx => {
				const byPath = groupBy(ctx.errors, "propString") as Record<
					string,
					ArkError[]
				>
				const pathDescriptions = Object.entries(byPath).map(
					([path, errors]) => {
						const branchesAtPath: string[] = []
						errors.forEach(errorAtPath =>
							// avoid duplicate messages when multiple branches
							// are invalid due to the same error
							appendUnique(branchesAtPath, errorAtPath.expected)
						)
						const expected = describeBranches(branchesAtPath)
						const actual = errors.reduce(
							(acc, e) =>
								e.actual && !acc.includes(e.actual) ?
									`${acc && `${acc}, `}${e.actual}`
								:	acc,
							""
						)
						return `${path && `${path} `}must be ${expected}${
							actual && ` (was ${actual})`
						}`
					}
				)
				return describeBranches(pathDescriptions)
			},
			problem: ctx => ctx.expected,
			message: ctx => ctx.problem
		},
		intersections: {
			union: (l, r, ctx) => {
				if (l.isNever !== r.isNever) {
					// if exactly one operand is never, we can use it to discriminate based on presence
					return Disjoint.from("presence", l, r)
				}
				let resultBranches: readonly UnionChildNode[] | Disjoint
				if (l.ordered) {
					if (r.ordered) return Disjoint.from("indiscriminableMorphs", l, r)

					resultBranches = intersectBranches(r.branches, l.branches, ctx)
					if (resultBranches instanceof Disjoint) resultBranches.invert()
				} else resultBranches = intersectBranches(l.branches, r.branches, ctx)

				if (resultBranches instanceof Disjoint) return resultBranches

				return ctx.$.schema(
					l.ordered || r.ordered ?
						{
							branches: resultBranches,
							ordered: true as const
						}
					:	{ branches: resultBranches }
				)
			},
			...defineRightwardIntersections("union", (l, r, ctx) => {
				const branches = intersectBranches(l.branches, [r], ctx)
				if (branches instanceof Disjoint) return branches

				if (branches.length === 1) return branches[0]

				return ctx.$.schema(
					l.ordered ? { branches, ordered: true } : { branches }
				)
			})
		}
	})

export class UnionNode extends BaseRoot<UnionDeclaration> {
	isNever: boolean = this.branches.length === 0
	isBoolean: boolean =
		this.branches.length === 2 &&
		this.branches[0].hasUnit(false) &&
		this.branches[1].hasUnit(true)

	unitBranches = this.branches.filter((n): n is UnitNode => n.hasKind("unit"))

	discriminator = this.discriminate()
	expression: string =
		this.isNever ? "never"
		: this.isBoolean ? "boolean"
		: this.branches.map(branch => branch.nestableExpression).join(" | ")

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.branches.some(b => b.traverseAllows(data, ctx))

	traverseApply: TraverseApply = (data, ctx) => {
		const errors: ArkError[] = []
		for (let i = 0; i < this.branches.length; i++) {
			ctx.pushBranch()
			this.branches[i].traverseApply(data, ctx)
			if (!ctx.hasError())
				return ctx.queuedMorphs.push(...ctx.popBranch().queuedMorphs)
			errors.push(ctx.popBranch().error!)
		}
		ctx.error({ code: "union", errors })
	}

	compile(js: NodeCompiler): void {
		if (
			!this.discriminator ||
			// if we have a union of two units like `boolean`, the
			// undiscriminated compilation will be just as fast
			(this.unitBranches.length === this.branches.length &&
				this.branches.length === 2)
		)
			return this.compileIndiscriminable(js)

		// we need to access the path as optional so we don't throw if it isn't present
		const condition = this.discriminator.path.reduce(
			(acc, segment) => acc + compileLiteralPropAccess(segment, true),
			this.discriminator.kind === "domain" ? "typeof data" : "data"
		)

		const cases = this.discriminator.cases

		js.block(`switch(${condition})`, () => {
			for (const k in cases) {
				const caseCondition = k === "default" ? "default" : `case ${k}`
				js.line(`${caseCondition}: return ${js.invoke(cases[k])}`)
			}

			return js
		})

		js.return(false)
	}

	private compileIndiscriminable(js: NodeCompiler): void {
		if (js.traversalKind === "Apply") {
			js.const("errors", "[]")
			this.branches.forEach(branch =>
				js
					.line("ctx.pushBranch()")
					.line(js.invoke(branch))
					.if("!ctx.hasError()", () =>
						js.return("ctx.queuedMorphs.push(...ctx.popBranch().queuedMorphs)")
					)
					.line("errors.push(ctx.popBranch().error)")
			)
			js.line(`ctx.error({ code: "union", errors })`)
		} else {
			this.branches.forEach(branch =>
				js.if(`${js.invoke(branch)}`, () => js.return(true))
			)
			js.return(false)
		}
	}

	rawKeyOf(): BaseRoot {
		return this.branches.reduce(
			(result, branch) => result.and(branch.rawKeyOf()),
			this.$.keywords.unknown.raw
		)
	}

	get nestableExpression(): string {
		// avoid adding unnecessary parentheses around boolean since it's
		// already collapsed to a single keyword
		return this.isBoolean ? "boolean" : super.nestableExpression
	}

	@cached
	discriminate(): Discriminator | null {
		if (this.unitBranches.length === this.branches.length) {
			const cases: DiscriminatedCases = flatMorph(
				this.unitBranches,
				(i, unit) => [`${unit.serializedValue}`, unit]
			)
			return {
				path: [],
				kind: "unit",
				cases
			}
		}
		const casesBySpecifier: CasesBySpecifier = {}
		for (let lIndex = 0; lIndex < this.branches.length - 1; lIndex++) {
			const l = this.branches[lIndex]
			for (let rIndex = lIndex + 1; rIndex < this.branches.length; rIndex++) {
				const r = this.branches[rIndex]
				const result = intersectNodesRoot(l, r, l.$)
				if (!(result instanceof Disjoint)) continue

				for (const { path, kind, disjoint } of result.flat) {
					if (!isKeyOf(kind, discriminatorKinds)) continue

					const qualifiedDiscriminator: DiscriminatorKey = `${path}${kind}`
					let lSerialized: string
					let rSerialized: string
					if (kind === "domain") {
						lSerialized = (disjoint.l as DomainNode).domain
						rSerialized = (disjoint.r as DomainNode).domain
					} else if (kind === "unit") {
						lSerialized = compileSerializedValue(disjoint.l)
						rSerialized = compileSerializedValue(disjoint.r)
					} else {
						return throwInternalError(
							`Unexpected attempt to discriminate disjoint kind '${kind}'`
						)
					}
					if (!casesBySpecifier[qualifiedDiscriminator]) {
						casesBySpecifier[qualifiedDiscriminator] = {
							[lSerialized]: [l],
							[rSerialized]: [r]
						}
						continue
					}
					const cases = casesBySpecifier[qualifiedDiscriminator]!
					if (!isKeyOf(lSerialized, cases)) cases[lSerialized] = [l]
					else if (!cases[lSerialized].includes(l)) cases[lSerialized].push(l)

					if (!isKeyOf(rSerialized, cases)) cases[rSerialized] = [r]
					else if (!cases[rSerialized].includes(r)) cases[rSerialized].push(r)
				}
			}
		}

		const bestDiscriminatorEntry = entriesOf(casesBySpecifier)
			.sort((a, b) => Object.keys(a[1]).length - Object.keys(b[1]).length)
			.at(-1)

		if (!bestDiscriminatorEntry) return null

		const [specifier, bestCases] = bestDiscriminatorEntry
		const [path, kind] = parseDiscriminatorKey(specifier)

		return {
			kind,
			path,
			cases: flatMorph(bestCases, (k, branches) => [
				k,
				// TODO: prune
				branches.length === 1 ? branches[0] : this.$.node("union", branches)
			])
		}
	}
}

const describeBranches = (descriptions: string[]) => {
	if (descriptions.length === 0) return "never"

	if (descriptions.length === 1) return descriptions[0]
	if (
		(descriptions.length === 2 &&
			descriptions[0] === "false" &&
			descriptions[1] === "true") ||
		(descriptions[0] === "true" && descriptions[1] === "false")
	)
		return "boolean"
	let description = ""
	for (let i = 0; i < descriptions.length - 1; i++) {
		description += descriptions[i]
		if (i < descriptions.length - 2) description += ", "
	}
	description += ` or ${descriptions[descriptions.length - 1]}`
	return description
}

export const intersectBranches = (
	l: readonly UnionChildNode[],
	r: readonly UnionChildNode[],
	ctx: IntersectionContext
): readonly UnionChildNode[] | Disjoint => {
	// If the corresponding r branch is identified as a subtype of an l branch, the
	// value at rIndex is set to null so we can avoid including previous/future
	// inersections in the reduced result.
	const batchesByR: (BaseRoot[] | null)[] = r.map(() => [])
	for (let lIndex = 0; lIndex < l.length; lIndex++) {
		let candidatesByR: { [rIndex: number]: BaseRoot } = {}
		for (let rIndex = 0; rIndex < r.length; rIndex++) {
			if (batchesByR[rIndex] === null) {
				// rBranch is a subtype of an lBranch and
				// will not yield any distinct intersection
				continue
			}
			if (l[lIndex].equals(r[rIndex])) {
				// Combination of subtype and supertype cases
				batchesByR[rIndex] = null
				candidatesByR = {}
				break
			}
			const branchIntersection = intersectNodes(l[lIndex], r[rIndex], ctx)
			if (branchIntersection instanceof Disjoint) {
				// Doesn't tell us anything useful about their relationships
				// with other branches
				continue
			}
			if (branchIntersection.equals(l[lIndex])) {
				// If the current l branch is a subtype of r, intersections
				// with previous and remaining branches of r won't lead to
				// distinct intersections.
				batchesByR[rIndex]!.push(l[lIndex])
				candidatesByR = {}
				break
			}
			if (branchIntersection.equals(r[rIndex])) {
				// If the current r branch is a subtype of l, set its batch to
				// null, removing any previous intersections and preventing any
				// of its remaining intersections from being computed.
				batchesByR[rIndex] = null
			} else {
				// If neither l nor r is a subtype of the other, add their
				// intersection as a candidate (could still be removed if it is
				// determined l or r is a subtype of a remaining branch).
				candidatesByR[rIndex] = branchIntersection
			}
		}
		for (const rIndex in candidatesByR) {
			// batchesByR at rIndex should never be null if it is in candidatesByR
			batchesByR[rIndex]![lIndex] = candidatesByR[rIndex]
		}
	}
	// Compile the reduced intersection result, including:
	// 		1. Remaining candidates resulting from distinct intersections or strict subtypes of r
	// 		2. Original r branches corresponding to indices with a null batch (subtypes of l)
	const resultBranches = batchesByR.flatMap(
		// ensure unions returned from branchable intersections like sequence are flattened
		(batch, i) => batch?.flatMap(branch => branch.branches) ?? r[i]
	)
	return resultBranches.length === 0 ?
			Disjoint.from("union", l, r)
		:	resultBranches
}

export const reduceBranches = ({
	branches,
	ordered
}: UnionInner): readonly UnionChildNode[] => {
	if (branches.length < 2) return branches

	const uniquenessByIndex: Record<number, boolean> = branches.map(() => true)
	for (let i = 0; i < branches.length; i++) {
		for (
			let j = i + 1;
			j < branches.length && uniquenessByIndex[i] && uniquenessByIndex[j];
			j++
		) {
			if (branches[i].equals(branches[j])) {
				// if the two branches are equal, only "j" is marked as
				// redundant so at least one copy could still be included in
				// the final set of branches.
				uniquenessByIndex[j] = false
				continue
			}
			const intersection = intersectNodesRoot(
				branches[i],
				branches[j],
				branches[0].$
			)
			if (intersection instanceof Disjoint) continue

			if (intersection.equals(branches[i])) {
				if (!ordered) {
					// preserve ordered branches that are a subtype of a subsequent branch
					uniquenessByIndex[i] = false
				}
			} else if (intersection.equals(branches[j])) uniquenessByIndex[j] = false
		}
	}
	return branches.filter((_, i) => uniquenessByIndex[i])
}

export type CaseKey<kind extends DiscriminatorKind = DiscriminatorKind> =
	DiscriminatorKind extends kind ? string : DiscriminatorKinds[kind] | "default"

export type Discriminator<kind extends DiscriminatorKind = DiscriminatorKind> =
	{
		path: string[]
		kind: kind
		cases: DiscriminatedCases<kind>
	}

export type DiscriminatedCases<
	kind extends DiscriminatorKind = DiscriminatorKind
> = {
	[caseKey in CaseKey<kind>]: BaseRoot
}

type DiscriminatorKey = `${SerializedPath}${DiscriminatorKind}`

type CasesBySpecifier = {
	[k in DiscriminatorKey]?: Record<string, BaseRoot[]>
}

export type DiscriminatorKinds = {
	domain: Domain
	unit: SerializedPrimitive
}

const discriminatorKinds: keySet<DiscriminatorKind> = {
	domain: 1,
	unit: 1
}

export type DiscriminatorKind = show<keyof DiscriminatorKinds>

const parseDiscriminatorKey = (key: DiscriminatorKey) => {
	const lastPathIndex = key.lastIndexOf("]")
	return [
		JSON.parse(key.slice(0, lastPathIndex + 1)),
		key.slice(lastPathIndex + 1)
	] as [path: string[], kind: DiscriminatorKind]
}

// // TODO: if deeply includes morphs?
// const writeUndiscriminableMorphUnionMessage = <path extends string>(
// 	path: path
// ) =>
// 	`${
// 		path === "/" ? "A" : `At ${path}, a`
// 	} union including one or more morphs must be discriminable` as const
