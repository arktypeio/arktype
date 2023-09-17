import type { conform } from "@arktype/util"
import type { ConstraintKind } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import type { PredicateInput, PredicateNode } from "./predicate.js"
import type { BaseAttributes, inputOf, parseNode } from "./schema.js"
import { BaseNode } from "./schema.js"
import { inferred } from "./utils.js"

export interface TypeSchema extends BaseAttributes {
	branches: readonly PredicateNode[]
}

// TODO: improve this
export interface TypeInput extends BaseAttributes {
	branches: readonly PredicateInput[]
}

export class TypeNode<t = unknown> extends BaseNode<TypeSchema> {
	readonly kind = "type"

	declare infer: t;
	declare [inferred]: t

	declare condition: string

	static from = ((...branches: never[]) =>
		new TypeNode(branches as never)) as NodeParser

	static fromUnits = ((...branches: never[]) =>
		new TypeNode(branches as never)) as UnitsNodeParser

	extractUnit() {
		return this.branches.length === 1 && this.branches[0].kind === "predicate"
			? this.branches[0].extractUnit()
			: undefined
	}

	writeDefaultDescription() {
		return this.branches.length === 0 ? "never" : this.branches.join(" or ")
	}

	constrain<kind extends ConstraintKind>(
		kind: kind,
		definition: inputOf<kind>
	): TypeNode<t> {
		return this
	}

	hash() {
		return ""
	}

	references() {
		return this.branches.flatMap((branch) => branch.references())
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	allows(data: unknown) {
		return true
	}

	and<other extends TypeNode>(
		other: other // TODO: inferIntersection
	): TypeNode<t & other["infer"]> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	intersect(other: TypeNode) {
		const resultBranches = intersectBranches(this.branches, other.branches)
		if (resultBranches.length === 0) {
			return Disjoint.from("union", this.branches, other.branches)
		}
		return new TypeNode({
			branches: resultBranches
		})
	}

	or<other extends TypeNode>(other: other): TypeNode<t | other["infer"]> {
		return this
	}

	isUnknown(): this is PredicateNode<unknown> {
		return (
			this.branches.length === 1 && this.branches[1].constraints.length === 0
		)
	}

	isNever(): this is TypeNode<never> {
		return this.branches.length === 0
	}

	array(): TypeNode<t[]> {
		return new TypeNode({ branches: [] })
	}

	extends<other>(other: TypeNode<other>): this is TypeNode<other> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}

	getPath(...path: (string | TypeNode<string>)[]): TypeNode {
		return this
	}
}

export const node = Object.assign(TypeNode.from, {
	units: TypeNode.fromUnits
})

type NodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: conform<
				branches[i],
				branches[i] extends PredicateInput<infer basis>
					? PredicateInput<basis>
					: PredicateInput
			>
		}
	): TypeNode<
		{
			[i in keyof branches]: parseNode<
				typeof PredicateNode,
				conform<branches[i], PredicateInput>
			> extends PredicateNode<infer t>
				? t
				: unknown
		}[number]
	>
}

type UnitsNodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: branches
	): TypeNode<branches[number]>
}

// // discriminate is cached so we don't have to worry about this running multiple times
// get discriminant() {
// 	return discriminate(this.branches)
// }

export const reduceBranches = (branches: PredicateNode[]) => {
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

export const intersectBranches = (
	l: readonly PredicateNode[],
	r: readonly PredicateNode[]
): readonly PredicateNode[] => {
	// Branches that are determined to be a subtype of an opposite branch are
	// guaranteed to be a member of the final reduced intersection, so long as
	// each individual set of branches has been correctly reduced to exclude
	// redundancies.
	const finalBranches: PredicateNode[] = []
	// Each rBranch is initialized to an empty array to which distinct
	// intersections will be appended. If the rBranch is identified as a
	// subtype or equal of any lBranch, the corresponding value should be
	// set to null so we can avoid including previous/future intersections
	// in the final result.
	const candidatesByR: (PredicateNode[] | null)[] = r.map(() => [])
	for (let lIndex = 0; lIndex < l.length; lIndex++) {
		const lBranch = l[lIndex]
		let currentCandidateByR: { [rIndex in number]: PredicateNode } = {}
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
	return finalBranches
}

// export const compileDiscriminant = (
// 	discriminant: Discriminant,
// 	ctx: CompilationContext
// ) => {
// 	if (discriminant.isPureRootLiteral) {
// 		// TODO: ctx?
// 		return compileDiscriminatedLiteral(discriminant.cases)
// 	}
// 	let compiledPath = In
// 	for (const segment of discriminant.path) {
// 		// we need to access the path as optional so we don't throw if it isn't present
// 		compiledPath += compilePropAccess(segment, true)
// 	}
// 	const condition =
// 		discriminant.kind === "domain" ? `typeof ${compiledPath}` : compiledPath
// 	let compiledCases = ""
// 	for (const k in discriminant.cases) {
// 		const caseCondition = k === "default" ? "default" : `case ${k}`
// 		const caseBranches = discriminant.cases[k]
// 		ctx.discriminants.push(discriminant)
// 		const caseChecks = isArray(caseBranches)
// 			? compileIndiscriminable(caseBranches, ctx)
// 			: compileDiscriminant(caseBranches, ctx)
// 		ctx.discriminants.pop()
// 		compiledCases += `${caseCondition}: {
//     ${caseChecks ? `${caseChecks}\n     break` : "break"}
// }`
// 	}
// 	if (!discriminant.cases.default) {
// 		// TODO: error message for traversal
// 		compiledCases += `default: {
//     return false
// }`
// 	}
// 	return `switch(${condition}) {
//     ${compiledCases}
// }`
// }

// const compileDiscriminatedLiteral = (cases: DiscriminatedCases) => {
// 	// TODO: error messages for traversal
// 	const caseKeys = Object.keys(cases)
// 	if (caseKeys.length === 2) {
// 		return `if( ${In} !== ${caseKeys[0]} && ${In} !== ${caseKeys[1]}) {
//     return false
// }`
// 	}
// 	// for >2 literals, we fall through all cases, breaking on the last
// 	const compiledCases =
// 		caseKeys.map((k) => `    case ${k}:`).join("\n") + "        break"
// 	// if none of the cases are met, the check fails (this is optimal for perf)
// 	return `switch(${In}) {
//     ${compiledCases}
//     default:
//         return false
// }`
// }

// export const compileIndiscriminable = (
// 	branches: readonly Predicate[],
// 	ctx: CompilationContext
// ) => {
// 	if (branches.length === 0) {
// 		return compileFailureResult("custom", "nothing", ctx)
// 	}
// 	if (branches.length === 1) {
// 		return branches[0].compile(ctx)
// 	}
// 	return branches
// 		.map(
// 			(branch) => `(() => {
// ${branch.compile(ctx)}
// return true
// })()`
// 		)
// 		.join(" || ")
// }

// type inferPredicateDefinition<t> = t
