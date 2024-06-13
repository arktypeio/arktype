import {
	appendUnique,
	arrayEquals,
	cached,
	compileLiteralPropAccess,
	compileSerializedValue,
	domainDescriptions,
	flatMorph,
	groupBy,
	isArray,
	isKeyOf,
	printable,
	registeredReference,
	throwInternalError,
	throwParseError,
	type Domain,
	type Json,
	type Key,
	type SerializedPrimitive,
	type array,
	type keySet,
	type show
} from "@arktype/util"
import type { Node, NodeSchema } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoints } from "../shared/disjoint.js"
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
import type { TraversalPath } from "../shared/utils.js"
import type { DomainInner, DomainNode } from "./domain.js"
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
						// if there are multiple actual descriptions that differ,
						// just fall back to printable, which is the most specific
						const actual =
							errors.every(e => e.actual === errors[0].actual) ?
								errors[0].actual
							:	printable(errors[0].data)
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
					return Disjoints.init("presence", l, r)
				}
				let resultBranches: readonly UnionChildNode[] | Disjoints
				if (l.ordered) {
					if (r.ordered) {
						throwParseError(
							writeOrderedIntersectionMessage(l.expression, r.expression)
						)
					}

					resultBranches = intersectBranches(r.branches, l.branches, ctx)
					if (resultBranches instanceof Disjoints) resultBranches.invert()
				} else resultBranches = intersectBranches(l.branches, r.branches, ctx)

				if (resultBranches instanceof Disjoints) return resultBranches

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
				if (branches instanceof Disjoints) return branches

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

	discriminant = this.discriminate()
	discriminantJson =
		this.discriminant ? discriminantToJson(this.discriminant) : null

	expression: string = expressBranches(
		this.branches.map(n => n.nestableExpression)
	)

	get shortDescription(): string {
		return describeBranches(
			this.branches.map(branch => branch.shortDescription)
		)
	}

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
			!this.discriminant ||
			// if we have a union of two units like `boolean`, the
			// undiscriminated compilation will be just as fast
			(this.unitBranches.length === this.branches.length &&
				this.branches.length === 2)
		)
			return this.compileIndiscriminable(js)

		// we need to access the path as optional so we don't throw if it isn't present
		const condition = this.discriminant.path.reduce<string>(
			(acc, k) => acc + compileLiteralPropAccess(k, true),
			this.discriminant.kind === "domain" ? "typeof data" : "data"
		)

		const cases = this.discriminant.cases

		const caseKeys = Object.keys(cases)

		js.block(`switch(${condition})`, () => {
			for (const k in cases) {
				const v = cases[k]
				const caseCondition = k === "default" ? "default" : `case ${k}`
				js.line(`${caseCondition}: return ${v === true ? v : js.invoke(v)}`)
			}

			return js
		})

		if (js.traversalKind === "Allows") {
			js.return(false)
			return
		}

		const expected = describeBranches(
			this.discriminant.kind === "domain" ?
				caseKeys.map(k => domainDescriptions[k.slice(1, -1) as Domain])
			:	caseKeys
		)

		const serializedPathSegments = this.discriminant.path.map(k =>
			typeof k === "string" ? JSON.stringify(k) : registeredReference(k)
		)

		js.line(`ctx.error({
	expected: ${JSON.stringify(expected)},
	actual: ${condition},
	relativePath: [${serializedPathSegments}]
})`)
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
	discriminate(): Discriminant | null {
		if (this.branches.length < 2) return null
		if (this.unitBranches.length === this.branches.length) {
			const cases = flatMorph(this.unitBranches, (i, unit) => [
				`${unit.serializedValue}`,
				true as const
			])

			return {
				path: [],
				kind: "unit",
				cases
			}
		}
		const candidates: DiscriminantCandidate[] = []
		for (let lIndex = 0; lIndex < this.branches.length - 1; lIndex++) {
			const l = this.branches[lIndex]
			for (let rIndex = lIndex + 1; rIndex < this.branches.length; rIndex++) {
				const r = this.branches[rIndex]
				const result = intersectNodesRoot(l.in, r.in, l.$)
				if (!(result instanceof Disjoints)) continue

				for (const entry of result) {
					if (!isKeyOf(entry.kind, discriminantKinds)) continue

					let lSerialized: string
					let rSerialized: string
					if (entry.kind === "domain") {
						lSerialized = `"${(entry.l as DomainNode).domain}"`
						rSerialized = `"${(entry.r as DomainNode).domain}"`
					} else if (entry.kind === "unit") {
						lSerialized = (entry.l as UnitNode).serializedValue as never
						rSerialized = (entry.r as UnitNode).serializedValue as never
					} else {
						return throwInternalError(
							`Unexpected attempt to discriminate disjoint kind '${entry.kind}'`
						)
					}
					const matching = candidates.find(
						d => arrayEquals(d.path, entry.path) && d.kind === entry.kind
					)
					if (!matching) {
						candidates.push({
							kind: entry.kind,
							cases: {
								[lSerialized]: [l],
								[rSerialized]: [r]
							},
							path: entry.path
						})
						continue
					}

					matching.cases[lSerialized] = appendUnique(
						matching.cases[lSerialized],
						l
					)
					matching.cases[rSerialized] = appendUnique(
						matching.cases[rSerialized],
						r
					)
				}
			}
		}

		const best = candidates
			.sort((l, r) => Object.keys(l.cases).length - Object.keys(r.cases).length)
			.at(-1)

		if (!best) return null

		let defaultBranches = [...this.branches]

		const cases = flatMorph(best.cases, (k, caseBranches) => {
			const prunedBranches: BaseRoot[] = []
			defaultBranches = defaultBranches.filter(n => !caseBranches.includes(n))
			for (const branch of caseBranches) {
				const pruned = pruneDiscriminant(best.kind, best.path, branch)
				// if any branch of the union has no constraints (i.e. is unknown)
				// return it right away
				if (pruned === null) return [k, true as const]
				prunedBranches.push(pruned)
			}

			const caseNode =
				prunedBranches.length === 1 ?
					prunedBranches[0]
				:	this.$.node("union", prunedBranches)

			Object.assign(this.referencesById, caseNode.referencesById)

			return [k, caseNode]
		})

		if (defaultBranches.length) {
			cases.default = this.$.node("union", defaultBranches, {
				prereduced: true
			})

			Object.assign(this.referencesById, cases.default.referencesById)
		}

		return {
			kind: best.kind,
			path: best.path,
			cases
		}
	}
}

const discriminantToJson = (discriminant: Discriminant): Json => ({
	kind: discriminant.kind,
	path: discriminant.path.map(k =>
		typeof k === "string" ? k : compileSerializedValue(k)
	),
	cases: flatMorph(discriminant.cases, (k, node) => [
		k,
		node === true ? node
		: node.hasKind("union") && node.discriminantJson ? node.discriminantJson
		: node.json
	])
})

type DescribeBranchesOptions = {
	delimiter?: string
	finalDelimiter?: string
}

const describeExpressionOptions: DescribeBranchesOptions = {
	delimiter: " | ",
	finalDelimiter: " | "
}

const expressBranches = (expressions: string[]) =>
	describeBranches(expressions, describeExpressionOptions)

const describeBranches = (
	descriptions: string[],
	opts?: DescribeBranchesOptions
) => {
	const delimiter = opts?.delimiter ?? ", "
	const finalDelimiter = opts?.finalDelimiter ?? " or "

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
	// keep track of seen descriptions to avoid duplication
	const seen: Record<string, true | undefined> = {}
	for (let i = 0; i < descriptions.length - 1; i++) {
		if (seen[descriptions[i]]) continue
		seen[descriptions[i]] = true
		description += descriptions[i]
		if (i < descriptions.length - 2) description += delimiter
	}

	const lastDescription = descriptions.at(-1)!
	if (!seen[lastDescription])
		description += `${finalDelimiter}${descriptions[descriptions.length - 1]}`

	return description
}

export const intersectBranches = (
	l: readonly UnionChildNode[],
	r: readonly UnionChildNode[],
	ctx: IntersectionContext
): readonly UnionChildNode[] | Disjoints => {
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
			if (branchIntersection instanceof Disjoints) {
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
			Disjoints.init("union", l, r)
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
				branches[i].in,
				branches[j].in,
				branches[0].$
			)!
			if (intersection instanceof Disjoints) continue

			if (!ordered) {
				if (branches[i].includesMorph) {
					throwParseError(
						writeIndiscriminableMorphMessage(
							branches[i].expression,
							branches[j].expression
						)
					)
				}
				if (branches[j].includesMorph) {
					throwParseError(
						writeIndiscriminableMorphMessage(
							branches[j].expression,
							branches[i].expression
						)
					)
				}
			}

			if (intersection.equals(branches[i].in)) {
				// preserve ordered branches that are a subtype of a subsequent branch
				uniquenessByIndex[i] = !!ordered
			} else if (intersection.equals(branches[j].in))
				uniquenessByIndex[j] = false
		}
	}
	return branches.filter((_, i) => uniquenessByIndex[i])
}

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
	DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export type Discriminant<kind extends DiscriminantKind = DiscriminantKind> = {
	path: Key[]
	kind: kind
	cases: DiscriminatedCases<kind>
}

type DiscriminantCandidate<kind extends DiscriminantKind = DiscriminantKind> = {
	path: Key[]
	kind: kind
	cases: CandidateCases<kind>
}

type CandidateCases<kind extends DiscriminantKind = DiscriminantKind> = {
	[caseKey in CaseKey<kind>]: BaseRoot[]
}

export type DiscriminatedCases<
	kind extends DiscriminantKind = DiscriminantKind
> = {
	[caseKey in CaseKey<kind>]: BaseRoot | true
}

export type DiscriminantKinds = {
	domain: Domain
	unit: SerializedPrimitive
}

const discriminantKinds: keySet<DiscriminantKind> = {
	domain: 1,
	unit: 1
}

export type DiscriminantKind = show<keyof DiscriminantKinds>

export const pruneDiscriminant = (
	discriminantKind: DiscriminantKind,
	path: TraversalPath,
	branch: BaseRoot
): BaseRoot | null =>
	branch.transform(
		(nodeKind, inner, ctx) => {
			// if we've already checked a path at least as long as the current one,
			// we don't need to revalidate that we're in an object
			if (
				nodeKind === "domain" &&
				(inner as DomainInner).domain === "object" &&
				path.length > ctx.path.length
			)
				return null

			// if the discriminant has already checked the domain at the current path
			// (or an exact value, implying a domain), we don't need to recheck it
			if (
				(discriminantKind === nodeKind ||
					(nodeKind === "domain" && ctx.path.length === path.length)) &&
				ctx.path.length === path.length &&
				ctx.path.every((segment, i) => segment === path[i])
			)
				return null
			return inner
		},
		{
			shouldTransform: node =>
				node.children.length !== 0 ||
				node.kind === "domain" ||
				node.kind === "unit"
		}
	)

export const writeIndiscriminableMorphMessage = (
	morphDescription: string,
	overlappingDescription: string
) =>
	`An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Morph Branch: ${morphDescription}
Overlapping Branch: ${overlappingDescription}`

export const writeOrderedIntersectionMessage = (
	lDescription: string,
	rDescription: string
) => `The intersection of two ordered unions is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`
