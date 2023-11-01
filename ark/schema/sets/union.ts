import { isArray, type mutable } from "@arktype/util"
import type { declareNode, withAttributes } from "../base.js"
import { type BasisKind } from "../bases/basis.js"
import { type Discriminant, discriminate } from "../discriminate.js"
import { Disjoint } from "../disjoint.js"
import { type Node } from "../nodes.js"
import { RootNode } from "../root.js"
import {
	type IntersectionNode,
	type IntersectionSchema
} from "./intersection.js"
import { type MorphNode, type MorphSchema } from "./morph.js"

export type BranchNode = IntersectionNode | MorphNode | Node<BasisKind>

export type ExpandedUnionSchema<
	branches extends readonly BranchSchema[] = readonly BranchSchema[]
> = withAttributes<{
	readonly union: branches
}>

export type UnionSchema = readonly BranchSchema[] | ExpandedUnionSchema

export type UnionInner = withAttributes<{
	readonly union: readonly BranchNode[]
}>

export type BranchSchema = IntersectionSchema | MorphSchema

export type UnionDeclaration = declareNode<
	"union",
	{
		schema: UnionSchema
		inner: UnionInner
		intersections: {
			union: "union" | Disjoint
			morph: "union" | Disjoint
			intersection: "union" | Disjoint
			rule: "union" | Disjoint
		}
	},
	typeof UnionNode
>

export class UnionNode<t = unknown> extends RootNode<UnionDeclaration, t> {
	static readonly kind = "union"

	constructor(inner: UnionInner) {
		super(inner)
	}

	static {
		this.classesByKind.union = this
	}

	static children(inner: UnionInner) {
		return inner.union
	}

	static readonly keyKinds = this.declareKeys({
		union: "in"
	})

	static parse = this.defineParser((schema) => {
		const result = {} as mutable<UnionInner>
		let schemaBranches: readonly BranchSchema[]
		if (isArray(schema)) {
			schemaBranches = schema
		} else {
			const { union: branches, ...attributes } = schema
			Object.assign(result, attributes)
			schemaBranches = branches
		}
		result.union = schemaBranches.map((branch) =>
			typeof branch === "object" && "morph" in branch
				? this.classesByKind.morph.parse(branch)
				: this.classesByKind.intersection.parse(branch)
		)
		return result
	})

	private static intersectBranch = (
		l: UnionNode,
		r: BranchNode
	): Disjoint | UnionInner => {
		const union = intersectBranches(l.union, [r])
		if (union instanceof Disjoint) {
			return union
		}
		return { union }
	}

	static compile = this.defineCompiler((inner) => "true")

	// discriminate is cached so we don't have to worry about this running multiple times
	get discriminant(): Discriminant | null {
		return discriminate(this.union)
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

	static readonly intersections = this.defineIntersections({
		union: (l, r) => {
			if (
				(l.union.length === 0 || r.union.length === 0) &&
				l.union.length !== r.union.length
			) {
				// if exactly one operand is never, we can use it to discriminate based on presence
				return Disjoint.from(
					"presence",
					l.union.length !== 0,
					r.union.length !== 0
				)
			}
			const resultBranches = intersectBranches(l.union, r.union)
			if (resultBranches instanceof Disjoint) {
				return resultBranches
			}
			return { union: resultBranches }
		},
		morph: this.intersectBranch,
		intersection: this.intersectBranch,
		rule: (l, r) => {
			const branches: BranchNode[] = []
			for (const branch of l.union) {
				const branchResult = branch.intersect(r)
				if (!(branchResult instanceof Disjoint)) {
					branches.push(branchResult)
				}
			}
			return branches.length === 0
				? Disjoint.from("union", l.union, [r])
				: {
						union: branches
				  }
		}
	})

	static writeDefaultDescription(inner: UnionInner) {
		return inner.union.length === 0 ? "never" : inner.union.join(" or ")
	}
}

export const intersectBranches = (
	l: readonly BranchNode[],
	r: readonly BranchNode[]
): readonly BranchNode[] | Disjoint => {
	// Branches that are determined to be a subtype of an opposite branch are
	// guaranteed to be a member of the final reduced intersection, so long as
	// each individual set of branches has been correctly reduced to exclude
	// redundancies.
	const finalBranches: BranchNode[] = []
	// Each rBranch is initialized to an empty array to which distinct
	// intersections will be appended. If the rBranch is identified as a
	// subtype or equal of any lBranch, the corresponding value should be
	// set to null so we can avoid including previous/future intersections
	// in the final result.
	const candidatesByR: (BranchNode[] | null)[] = r.map(() => [])
	for (let lIndex = 0; lIndex < l.length; lIndex++) {
		const lBranch = l[lIndex]
		let currentCandidateByR: { [rIndex in number]: BranchNode } = {}
		for (let rIndex = 0; rIndex < r.length; rIndex++) {
			const rBranch = r[rIndex]
			if (!candidatesByR[rIndex]) {
				// we've identified rBranch as a subtype of
				// an lBranch and will not yield any distinct intersections.
				continue
			}
			if (lBranch === rBranch) {
				// Combination of subtype and supertype cases
				finalBranches.push(lBranch)
				candidatesByR[rIndex] = null
				currentCandidateByR = {}
				break
			}
			const branchIntersection = lBranch.intersect(rBranch)
			if (branchIntersection instanceof Disjoint) {
				// doesn't tell us about any redundancies or add a distinct intersection
				continue
			}
			if (branchIntersection === lBranch) {
				// If l is a subtype of the current r branch, intersections
				// with previous and remaining branches of r won't lead to
				// distinct intersections, so empty currentCandidatesByR and break
				// from the inner loop.
				finalBranches.push(lBranch)
				currentCandidateByR = {}
				break
			}
			if (branchIntersection === rBranch) {
				// If r is a subtype of the current l branch, set its
				// intersections to null, removing any previous
				// intersections and preventing any of its
				// remaining intersections from being computed.
				finalBranches.push(rBranch)
				candidatesByR[rIndex] = null
				continue
			}
			// If neither l nor r is a subtype of the other, add their
			// intersection as a candidate to the current batch (could
			// still be removed if it is determined l or r is a subtype
			// of a remaining branch).
			currentCandidateByR[rIndex] = branchIntersection
		}
		for (const rIndex in currentCandidateByR) {
			// candidatesByR at rIndex should never be null if it is in currentCandidates
			candidatesByR[rIndex]!.push(currentCandidateByR[rIndex])
		}
	}
	// All remaining candidates are distinct, so include them in the final result
	for (const candidates of candidatesByR) {
		candidates?.forEach((candidate) => finalBranches.push(candidate))
	}
	if (finalBranches.length === 0) {
		return Disjoint.from("union", l, r)
	}
	return finalBranches
}

export const reduceBranches = (branches: BranchNode[]) => {
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
			if (branches[i] === branches[j]) {
				// if the two branches are equal, only "j" is marked as
				// redundant so at least one copy could still be included in
				// the final set of branches.
				uniquenessByIndex[j] = false
				continue
			}
			const intersection = branches[i].intersect(branches[j])
			if (intersection === branches[i]) {
				uniquenessByIndex[i] = false
			} else if (intersection === branches[j]) {
				uniquenessByIndex[j] = false
			}
		}
	}
	return branches.filter((_, i) => uniquenessByIndex[i])
}
