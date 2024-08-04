import {
	appendUnique,
	arrayEquals,
	cached,
	domainDescriptions,
	flatMorph,
	groupBy,
	isArray,
	isKeyOf,
	printable,
	throwInternalError,
	throwParseError,
	type Json,
	type Key,
	type SerializedPrimitive,
	type array,
	type keySet,
	type show
} from "@ark/util"
import type { NodeSchema, nodeOfKind } from "../kinds.js"
import { typePathToPropString } from "../node.js"
import {
	compileLiteralPropAccess,
	compileSerializedValue,
	type NodeCompiler
} from "../shared/compile.js"
import type {
	BaseErrorContext,
	BaseInner,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkError } from "../shared/errors.js"
import {
	implementNode,
	schemaKindsRightOf,
	type IntersectionContext,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes, intersectNodesRoot } from "../shared/intersections.js"
import { registeredReference } from "../shared/registry.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { hasArkKind, pathToPropString } from "../shared/utils.js"
import type { Domain } from "./domain.js"
import type { Morph } from "./morph.js"
import { BaseRoot, type schemaKindRightOf } from "./root.js"
import type { Unit } from "./unit.js"
import { defineRightwardIntersections } from "./utils.js"

export namespace Union {
	export type ChildKind = schemaKindRightOf<"union"> | "alias"

	export type ChildSchema = NodeSchema<ChildKind>

	export type ChildNode = nodeOfKind<ChildKind>

	// allow union nodes as branch definitions that will be flattened on parsing
	export type BranchSchema = ChildSchema | BaseRoot

	export type Schema<
		branches extends readonly BranchSchema[] = readonly BranchSchema[]
	> = NormalizedSchema<branches> | branches

	export interface NormalizedSchema<
		branches extends readonly BranchSchema[] = readonly BranchSchema[]
	> extends BaseNormalizedSchema {
		readonly branches: branches
		readonly ordered?: true
	}

	export interface Inner extends BaseInner {
		readonly branches: readonly ChildNode[]
		readonly ordered?: true
	}

	export interface ErrorContext extends BaseErrorContext<"union"> {
		readonly errors: readonly ArkError[]
	}

	export interface Declaration
		extends declareNode<{
			kind: "union"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			errorContext: ErrorContext
			reducibleTo: RootKind
			childKind: ChildKind
		}> {}

	export type Node = UnionNode
}

const unionChildKinds: array<Union.ChildKind> = [
	...schemaKindsRightOf("union"),
	"alias"
]

const implementation: nodeImplementationOf<Union.Declaration> =
	implementNode<Union.Declaration>({
		kind: "union",
		hasAssociatedError: true,
		collapsibleKey: "branches",
		keys: {
			ordered: {},
			branches: {
				child: true,
				parse: (schema, ctx) => {
					const branches = schema.flatMap(branch =>
						hasArkKind(branch, "root") ?
							branch.branches
						:	ctx.$.node(unionChildKinds, branch as Union.ChildSchema)
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
				node.distribute(branch => branch.description, describeBranches),
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
					return Disjoint.init("presence", l, r)
				}
				let resultBranches: readonly Union.ChildNode[] | Disjoint
				if (l.ordered) {
					if (r.ordered) {
						throwParseError(
							writeOrderedIntersectionMessage(l.expression, r.expression)
						)
					}

					resultBranches = intersectBranches(r.branches, l.branches, ctx)
					if (resultBranches instanceof Disjoint) resultBranches.invert()
				} else resultBranches = intersectBranches(l.branches, r.branches, ctx)

				if (resultBranches instanceof Disjoint) return resultBranches

				return ctx.$.rootNode(
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

				return ctx.$.rootNode(
					l.ordered ? { branches, ordered: true } : { branches }
				)
			})
		}
	})

export class UnionNode extends BaseRoot<Union.Declaration> {
	isBoolean: boolean =
		this.branches.length === 2 &&
		this.branches[0].hasUnit(false) &&
		this.branches[1].hasUnit(true)

	unitBranches = this.branches.filter((n): n is Unit.Node | Morph.Node =>
		n.in.hasKind("unit")
	)

	discriminant = this.discriminate()
	discriminantJson =
		this.discriminant ? discriminantToJson(this.discriminant) : null

	expression: string = this.distribute(
		n => n.nestableExpression,
		expressBranches
	)

	get shortDescription(): string {
		return this.distribute(branch => branch.shortDescription, describeBranches)
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
				const caseCondition = k === "default" ? k : `case ${k}`
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

	get nestableExpression(): string {
		// avoid adding unnecessary parentheses around boolean since it's
		// already collapsed to a single keyword
		return this.isBoolean ? "boolean" : super.nestableExpression
	}

	@cached
	discriminate(): Discriminant | null {
		if (this.branches.length < 2) return null
		if (this.unitBranches.length === this.branches.length) {
			const cases = flatMorph(this.unitBranches, (i, n) => [
				`${(n.in as Unit.Node).serializedValue}`,
				n.hasKind("morph") ? n : (true as const)
			])

			return {
				kind: "unit",
				path: [],
				propString: "",
				cases
			}
		}
		const candidates: DiscriminantCandidate[] = []
		for (let lIndex = 0; lIndex < this.branches.length - 1; lIndex++) {
			const l = this.branches[lIndex]
			for (let rIndex = lIndex + 1; rIndex < this.branches.length; rIndex++) {
				const r = this.branches[rIndex]
				const result = intersectNodesRoot(l.in, r.in, l.$)
				if (!(result instanceof Disjoint)) continue

				for (const entry of result) {
					if (!isKeyOf(entry.kind, discriminantKinds) || entry.optional)
						continue

					let lSerialized: string
					let rSerialized: string
					if (entry.kind === "domain") {
						lSerialized = `"${(entry.l as Domain.Node).domain}"`
						rSerialized = `"${(entry.r as Domain.Node).domain}"`
					} else if (entry.kind === "unit") {
						lSerialized = (entry.l as Unit.Node).serializedValue as never
						rSerialized = (entry.r as Unit.Node).serializedValue as never
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

		const bestCtx: DiscriminantContext = {
			kind: best.kind,
			path: best.path,
			propString: pathToPropString(best.path)
		}

		const cases = flatMorph(best.cases, (k, caseBranches) => {
			const prunedBranches: BaseRoot[] = []
			defaultBranches = defaultBranches.filter(n => !caseBranches.includes(n))
			for (const branch of caseBranches) {
				const pruned = pruneDiscriminant(branch, bestCtx)
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
			propString: pathToPropString(best.path),
			cases
		}
	}
}

export const Union = {
	implementation,
	Node: UnionNode
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
	l: readonly Union.ChildNode[],
	r: readonly Union.ChildNode[],
	ctx: IntersectionContext
): readonly Union.ChildNode[] | Disjoint => {
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
			Disjoint.init("union", l, r)
		:	resultBranches
}

export const reduceBranches = ({
	branches,
	ordered
}: Union.Inner): readonly Union.ChildNode[] => {
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
			if (intersection instanceof Disjoint) continue

			if (
				!ordered &&
				(branches[i].includesMorph || branches[j].includesMorph) &&
				(!arrayEquals(branches[i].shallowMorphs, branches[j].shallowMorphs, {
					isEqual: (l, r) => l.hasEqualMorphs(r)
				}) ||
					!arrayEquals(branches[i].flatMorphs, branches[j].flatMorphs, {
						isEqual: (l, r) =>
							l.propString === r.propString && l.node.hasEqualMorphs(r.node)
					}))
			) {
				throwParseError(
					writeIndiscriminableMorphMessage(
						branches[i].expression,
						branches[j].expression
					)
				)
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

type DiscriminantContext<kind extends DiscriminantKind = DiscriminantKind> = {
	path: Key[]
	propString: string
	kind: kind
}

export interface Discriminant<kind extends DiscriminantKind = DiscriminantKind>
	extends DiscriminantContext<kind> {
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
	discriminantBranch: BaseRoot,
	discriminantCtx: DiscriminantContext
): BaseRoot | null =>
	discriminantBranch.transform(
		(nodeKind, inner, ctx) => {
			// if we've already checked a path at least as long as the current one,
			// we don't need to revalidate that we're in an object
			if (
				nodeKind === "domain" &&
				(inner as Domain.Inner).domain === "object" &&
				discriminantCtx.path.length >= ctx.path.length
			)
				return null

			// if the discriminant has already checked the domain at the current path
			// (or a unit literal, implying a domain), we don't need to recheck it
			if (
				(nodeKind === "domain" || discriminantCtx.kind === "unit") &&
				typePathToPropString(ctx.path) === discriminantCtx.propString
			)
				return null
			return inner
		},
		{
			shouldTransform: node =>
				// we don't need to recurse into index nodes as they will never
				// have a required path therefore can't be used to discriminate
				(node.children.length !== 0 && node.kind !== "index") ||
				node.kind === "domain" ||
				node.kind === "unit"
		}
	)

export const writeIndiscriminableMorphMessage = (
	lDescription: string,
	rDescription: string
): string =>
	`An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`

export const writeOrderedIntersectionMessage = (
	lDescription: string,
	rDescription: string
): string => `The intersection of two ordered unions is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`
