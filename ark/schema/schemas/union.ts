import { appendUnique, groupBy, isArray } from "@arktype/util"
import type { NodeDef } from "../kinds.js"
import type { Node } from "../node.js"
import type {
	RawSchema,
	RawSchemaAttachments,
	schemaKindRightOf
} from "../schema.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkTypeError } from "../shared/errors.js"
import {
	implementNode,
	type SchemaKind,
	schemaKindsRightOf
} from "../shared/implement.js"
import type { Discriminant } from "./discriminate.js"
import { defineRightwardIntersections } from "./utils.js"

export type UnionChildKind = schemaKindRightOf<"union">

export const unionChildKinds = schemaKindsRightOf("union")

export type UnionChildDef = NodeDef<UnionChildKind>

export type UnionChildNode = Node<UnionChildKind>

export type UnionDef<
	branches extends readonly UnionChildDef[] = readonly UnionChildDef[]
> = NormalizedUnionDef<branches> | branches

export interface NormalizedUnionDef<
	branches extends readonly UnionChildDef[] = readonly UnionChildDef[]
> extends BaseMeta {
	readonly branches: branches
	readonly ordered?: true
}

export interface UnionInner extends BaseMeta {
	readonly branches: readonly UnionChildNode[]
	readonly ordered?: true
}

export type UnionDeclaration = declareNode<{
	kind: "union"
	def: UnionDef
	normalizedDef: NormalizedUnionDef
	inner: UnionInner
	errorContext: {
		errors: readonly ArkTypeError[]
	}
	reducibleTo: SchemaKind
	childKind: UnionChildKind
	attachments: UnionAttachments
}>

export interface UnionAttachments
	extends RawSchemaAttachments<UnionDeclaration> {
	discriminant: Discriminant | null
	isBoolean: boolean
}

export const unionImplementation = implementNode<UnionDeclaration>({
	kind: "union",
	hasAssociatedError: true,
	collapsibleKey: "branches",
	keys: {
		ordered: {},
		branches: {
			child: true,
			parse: (def, ctx) => {
				const branches = def.map((branch) =>
					ctx.$.parseNode(unionChildKinds, branch)
				)
				const raw = ctx.raw as UnionDef
				if (isArray(raw) || raw.ordered !== true) {
					branches.sort((l, r) => (l.innerId < r.innerId ? -1 : 1))
				}
				return branches
			}
		}
	},
	normalize: (def) => (isArray(def) ? { branches: def } : def),
	reduce: (inner, $) => {
		const reducedBranches = reduceBranches(inner)
		if (reducedBranches.length === 1) {
			return reducedBranches[0]
		}
		if (reducedBranches.length === inner.branches.length) {
			return
		}
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
		description: (node) => {
			if (node.isBoolean) return "boolean"

			return describeBranches(node.branches.map((branch) => branch.description))
		},
		expected: (ctx) => {
			const byPath = groupBy(ctx.errors, "propString") as Record<
				string,
				ArkTypeError[]
			>
			const pathDescriptions = Object.entries(byPath).map(([path, errors]) => {
				errors.map((_) => _.expected)
				const branchesAtPath: string[] = []
				errors.forEach((errorAtPath) =>
					// avoid duplicate messages when multiple branches
					// are invalid due to the same error
					appendUnique(branchesAtPath, errorAtPath.expected)
				)
				const expected = describeBranches(branchesAtPath)
				const actual = ctx.errors.reduce(
					(acc, e) =>
						e.actual && !acc.includes(e.actual) ?
							`${acc && `${acc}, `}${e.actual}`
						:	acc,
					""
				)
				return `${path && `${path} `}must be ${expected}${
					actual && ` (was ${actual})`
				}`
			})
			return describeBranches(pathDescriptions)
		},
		problem: (ctx) => ctx.expected,
		message: (ctx) => ctx.problem
	},
	intersections: {
		union: (l, r, $) => {
			if (
				(l.branches.length === 0 || r.branches.length === 0) &&
				l.branches.length !== r.branches.length
			) {
				// if exactly one operand is never, we can use it to discriminate based on presence
				return Disjoint.from(
					"presence",
					l.branches.length !== 0,
					r.branches.length !== 0
				)
			}
			let resultBranches: readonly UnionChildNode[] | Disjoint
			if (l.ordered) {
				if (r.ordered) {
					return Disjoint.from("indiscriminableMorphs", l, r)
				}
				resultBranches = intersectBranches(r.branches, l.branches)
				if (resultBranches instanceof Disjoint) {
					resultBranches.invert()
				}
			} else {
				resultBranches = intersectBranches(l.branches, r.branches)
			}
			if (resultBranches instanceof Disjoint) {
				return resultBranches
			}
			return $.schema(
				l.ordered || r.ordered ?
					{
						branches: resultBranches,
						ordered: true as const
					}
				:	{ branches: resultBranches }
			)
		},
		...defineRightwardIntersections("union", (l, r, $) => {
			const branches = intersectBranches(l.branches, [r])
			if (branches instanceof Disjoint) {
				return branches
			}
			if (branches.length === 1) {
				return branches[0]
			}
			return $.schema(l.ordered ? { branches, ordered: true } : { branches })
		})
	},
	construct: (self) => {
		const branches = self.branches
		const isBoolean =
			branches.length === 2 &&
			branches[0].hasUnit(false) &&
			branches[1].hasUnit(true)
		return {
			discriminant: null,
			isBoolean,
			expression:
				isBoolean ? "boolean" : (
					branches.map((branch) => branch.nestableExpression).join(" | ")
				),
			traverseAllows: (data, ctx) =>
				branches.some((b) => b.traverseAllows(data, ctx)),
			traverseApply: (data, ctx) => {
				const errors: ArkTypeError[] = []
				for (let i = 0; i < branches.length; i++) {
					ctx.pushBranch()
					branches[i].traverseApply(data, ctx)
					if (!ctx.hasError()) return ctx.morphs.push(...ctx.popBranch().morphs)
					errors.push(ctx.popBranch().error!)
				}
				ctx.error({ code: "union", errors })
			},
			compile: (js) => {
				if (js.traversalKind === "Apply") {
					js.const("errors", "[]")
					branches.forEach((branch) =>
						js
							.line("ctx.pushBranch()")
							.line(js.invoke(branch))
							.if("!ctx.hasError()", () =>
								js.return("ctx.morphs.push(...ctx.popBranch().morphs)")
							)
							.line("errors.push(ctx.popBranch().error)")
					)
					js.line(`ctx.error({ code: "union", errors })`)
				} else {
					branches.forEach((branch) =>
						js.if(`${js.invoke(branch)}`, () => js.return(true))
					)
					js.return(false)
				}
			},
			rawKeyOf: (): RawSchema => {
				return branches.reduce(
					(result, branch) => result.intersectSatisfiable(branch.rawKeyOf()),
					self.$.keywords.unknown.raw
				)
			},
			get nestableExpression() {
				// avoid adding unnecessary parentheses around boolean since it's
				// already collapsed to a single keyword
				return this.isBoolean ? "boolean" : super.nestableExpression
			}
		}
	}
})

export type UnionNode = RawSchema<UnionDeclaration>

const describeBranches = (descriptions: string[]) => {
	if (descriptions.length === 0) {
		return "never"
	}
	if (descriptions.length === 1) {
		return descriptions[0]
	}
	let description = ""
	for (let i = 0; i < descriptions.length - 1; i++) {
		description += descriptions[i]
		if (i < descriptions.length - 2) {
			description += ", "
		}
	}
	description += ` or ${descriptions[descriptions.length - 1]}`
	return description
}

// 	private static compileDiscriminatedLiteral(cases: DiscriminatedCases) {
// 		// TODO: error messages for traversal
// 		const caseKeys = Object.keys(cases)
// 		if (caseKeys.length === 2) {
// 			return `if( ${this.argName} !== ${caseKeys[0]} && ${this.argName} !== ${caseKeys[1]}) {
//     return false
// }`
// 		}
// 		// for >2 literals, we fall through all cases, breaking on the last
// 		const compiledCases =
// 			caseKeys.map((k) => `    case ${k}:`).join("\n") + "        break"
// 		// if none of the cases are met, the check fails (this is optimal for perf)
// 		return `switch(${this.argName}) {
//     ${compiledCases}
//     default:
//         return false
// }`
// 	}

// 	private static compileIndiscriminable(
// 		branches: readonly BranchNode[],
// 		ctx: CompilationContext
// 	) {
// 		if (branches.length === 0) {
// 			return compileFailureResult("custom", "nothing", ctx)
// 		}
// 		if (branches.length === 1) {
// 			return branches[0].compile(ctx)
// 		}
// 		return branches
// 			.map(
// 				(branch) => `(() => {
// 	${branch.compile(ctx)}
// 	return true
// 	})()`
// 			)
// 			.join(" || ")
// 	}

// 	private static compileDiscriminant(
// 		discriminant: Discriminant,
// 		ctx: CompilationContext
// 	) {
// 		if (discriminant.isPureRootLiteral) {
// 			// TODO: ctx?
// 			return this.compileDiscriminatedLiteral(discriminant.cases)
// 		}
// 		let compiledPath = this.argName
// 		for (const segment of discriminant.path) {
// 			// we need to access the path as optional so we don't throw if it isn't present
// 			compiledPath += compilePropAccess(segment, true)
// 		}
// 		const condition =
// 			discriminant.kind === "domain" ? `typeof ${compiledPath}` : compiledPath
// 		let compiledCases = ""
// 		for (const k in discriminant.cases) {
// 			const caseCondition = k === "default" ? "default" : `case ${k}`
// 			const caseBranches = discriminant.cases[k]
// 			ctx.discriminants.push(discriminant)
// 			const caseChecks = isArray(caseBranches)
// 				? this.compileIndiscriminable(caseBranches, ctx)
// 				: this.compileDiscriminant(caseBranches, ctx)
// 			ctx.discriminants.pop()
// 			compiledCases += `${caseCondition}: {
// 		${caseChecks ? `${caseChecks}\n     break` : "break"}
// 	}`
// 		}
// 		if (!discriminant.cases.default) {
// 			// TODO: error message for traversal
// 			compiledCases += `default: {
// 		return false
// 	}`
// 		}
// 		return `switch(${condition}) {
// 		${compiledCases}
// 	}`
// 	}

export const intersectBranches = (
	l: readonly UnionChildNode[],
	r: readonly UnionChildNode[]
): readonly UnionChildNode[] | Disjoint => {
	// If the corresponding r branch is identified as a subtype of an l branch, the
	// value at rIndex is set to null so we can avoid including previous/future
	// inersections in the reduced result.
	const batchesByR: (RawSchema[] | null)[] = r.map(() => [])
	for (let lIndex = 0; lIndex < l.length; lIndex++) {
		let candidatesByR: { [rIndex: number]: RawSchema } = {}
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
			const branchIntersection = l[lIndex].intersect(r[rIndex])
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
		(batch, i) => batch?.flatMap((branch) => branch.branches) ?? r[i]
	)
	return resultBranches.length === 0 ?
			Disjoint.from("union", l, r)
		:	resultBranches
}

export const reduceBranches = ({
	branches,
	ordered
}: UnionInner): readonly UnionChildNode[] => {
	if (branches.length < 2) {
		return branches
	}
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
			const intersection = branches[i].intersect(branches[j])
			if (intersection instanceof Disjoint) {
				continue
			}
			if (intersection.equals(branches[i])) {
				if (!ordered) {
					// preserve ordered branches that are a subtype of a subsequent branch
					uniquenessByIndex[i] = false
				}
			} else if (intersection.equals(branches[j])) {
				uniquenessByIndex[j] = false
			}
		}
	}
	return branches.filter((_, i) => uniquenessByIndex[i])
}
