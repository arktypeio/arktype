import { isArray } from "@arktype/util"
import type { Node } from "../base.js"
import { composeParser } from "../parse.js"
import type {
	BaseAttributes,
	declareNode,
	withAttributes
} from "../shared/declare.js"
import { basisKinds, defineNode } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { Schema } from "../shared/nodes.js"
import { BaseType } from "../type.js"
import type { Discriminant } from "./discriminate.js"
import type { ValidatorKind } from "./morph.js"

export type BranchKind = "morph" | ValidatorKind

export type BranchDefinition = Schema<BranchKind>

export type BranchNode = Node<BranchKind>

export type UnionSchema<
	branches extends readonly BranchDefinition[] = readonly BranchDefinition[]
> = NormalizedUnionSchema<branches> | branches

export type NormalizedUnionSchema<
	branches extends readonly BranchDefinition[] = readonly BranchDefinition[]
> = withAttributes<{
	readonly branches: branches
	readonly ordered?: true
}>

export type UnionInner = {
	readonly branches: readonly BranchNode[]
	readonly ordered?: true
}

export type UnionAttachments = {
	discriminant: Discriminant | null
}

export type UnionDeclaration = declareNode<{
	kind: "union"
	schema: UnionSchema
	normalizedSchema: NormalizedUnionSchema
	inner: UnionInner
	meta: BaseAttributes
	intersections: {
		union: "union" | Disjoint
		morph: "union" | Disjoint
		intersection: "union" | Disjoint
		default: "union" | Disjoint
	}
	attach: UnionAttachments
}>

const intersectBranch = (
	l: Node<"union">,
	r: BranchNode
): Disjoint | UnionInner => {
	const branches = intersectBranches(l.branches, [r])
	if (branches instanceof Disjoint) {
		return branches
	}
	return l.ordered ? { branches, ordered: true } : { branches }
}

export const UnionImplementation = composeParser<UnionDeclaration>({
	kind: "union",
	collapseKey: "branches",
	keys: {
		ordered: {},
		branches: {
			child: true,
			parse: (schema, ctx) => {
				const branches = schema.map((branch) =>
					ctx.scope.parseTypeNode(branch, [
						"morph",
						"intersection",
						...basisKinds
					])
				)
				const def = ctx.definition as UnionSchema
				if (isArray(def) || def.ordered !== true) {
					branches.sort((l, r) => (l.innerId < r.innerId ? -1 : 1))
				}
				return branches
			}
		}
	},
	normalize: (schema) => (isArray(schema) ? { branches: schema } : schema),
	reduce: (inner, scope) => {
		const reducedBranches = reduceBranches(inner)
		if (reducedBranches.length === 1) {
			// TODO: description?
			return reducedBranches[0]
		}
		if (reducedBranches.length === inner.branches.length) {
			return
		}
		return scope.parsePrereduced("union", {
			...inner,
			branches: reducedBranches
		})
	},
	attach: (node) => {
		return {
			traverseAllows: (data, problems) =>
				node.branches.some((b) => b.traverseAllows(data, problems)),
			traverseApply: (data, problems) =>
				node.branches.forEach((b) => b.traverseApply(data, problems)),
			discriminant: null //discriminate(inner.branches)
		}
	}
})

// intersections: {
// 	union: (l, r) => {
// 		if (
// 			(l.branches.length === 0 || r.branches.length === 0) &&
// 			l.branches.length !== r.branches.length
// 		) {
// 			// if exactly one operand is never, we can use it to discriminate based on presence
// 			return Disjoint.from(
// 				"presence",
// 				l.branches.length !== 0,
// 				r.branches.length !== 0
// 			)
// 		}
// 		let resultBranches: readonly BranchNode[] | Disjoint
// 		if (l.ordered) {
// 			if (r.ordered) {
// 				return Disjoint.from("indiscriminableMorphs", l, r)
// 			}
// 			resultBranches = intersectBranches(r.branches, l.branches)
// 			if (resultBranches instanceof Disjoint) {
// 				resultBranches.invert()
// 			}
// 		} else {
// 			resultBranches = intersectBranches(l.branches, r.branches)
// 		}
// 		if (resultBranches instanceof Disjoint) {
// 			return resultBranches
// 		}
// 		return l.ordered || r.ordered
// 			? {
// 					branches: resultBranches,
// 					ordered: true
// 			  }
// 			: { branches: resultBranches }
// 	},
// 	morph: intersectBranch,
// 	intersection: intersectBranch,
// 	default: (l, r) => {
// 		const branches: BranchNode[] = []
// 		for (const branch of l.branches) {
// 			const branchResult = branch.intersect(r)
// 			if (!(branchResult instanceof Disjoint)) {
// 				branches.push(branchResult)
// 			}
// 		}
// 		return branches.length === 0
// 			? Disjoint.from("union", l.branches, [r])
// 			: l.ordered
// 			  ? {
// 						branches,
// 						ordered: true
// 				}
// 			  : { branches }
// 	}
// },

// writeDefaultDescription: (inner) =>
// inner.branches.length === 0 ? "never" : inner.branches.join(" or "),
// compile: (node, ctx) => {
// const branchInvocations = node.branches.map(
// 	(branch) =>
// 		`this.${branch.id}(${In}${
// 			ctx.compilationKind === "allows" ? "" : ", problems"
// 		})`
// )
// return ctx.compilationKind === "allows"
// 	? `return ${branchInvocations.join(" || ")}`
// 	: branchInvocations.join("\n")
// }

export class UnionNode<t = unknown> extends BaseType<t> {}

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
	l: readonly BranchNode[],
	r: readonly BranchNode[]
): readonly BranchNode[] | Disjoint => {
	// If the corresponding r branch is identified as a subtype of an l branch, the
	// value at rIndex is set to null so we can avoid including previous/future
	// inersections in the reduced result.
	const batchesByR: (BranchNode[] | null)[] = r.map(() => [])
	for (let lIndex = 0; lIndex < l.length; lIndex++) {
		let candidatesByR: { [rIndex: number]: BranchNode } = {}
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
	const resultBranches = batchesByR.flatMap((batch, i) => batch ?? r[i])
	return resultBranches.length === 0
		? Disjoint.from("union", l, r)
		: resultBranches
}

export const reduceBranches = ({ branches: union, ordered }: UnionInner) => {
	if (union.length < 2) {
		return union
	}
	const uniquenessByIndex: Record<number, boolean> = union.map(() => true)
	for (let i = 0; i < union.length; i++) {
		for (
			let j = i + 1;
			j < union.length && uniquenessByIndex[i] && uniquenessByIndex[j];
			j++
		) {
			if (union[i].equals(union[j])) {
				// if the two branches are equal, only "j" is marked as
				// redundant so at least one copy could still be included in
				// the final set of branches.
				uniquenessByIndex[j] = false
				continue
			}
			const intersection = union[i].intersect(union[j])
			if (intersection instanceof Disjoint) {
				continue
			}
			if (intersection.equals(union[i])) {
				if (!ordered) {
					// preserve ordered branches that are a subtype of a subsequent branch
					uniquenessByIndex[i] = false
				}
			} else if (intersection.equals(union[j])) {
				uniquenessByIndex[j] = false
			}
		}
	}
	return union.filter((_, i) => uniquenessByIndex[i])
}
