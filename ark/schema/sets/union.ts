import { type conform, isArray, type mutable } from "@arktype/util"
import type { declareNode, withAttributes } from "../base.js"
import { type Discriminant, discriminate } from "../discriminate.js"
import { Disjoint } from "../disjoint.js"
import { type Node, type Schema } from "../nodes.js"
import { BaseRoot, type Root } from "../root.js"
import {
	MorphNode,
	type MorphSchema,
	type parseMorphSchema,
	parseValidatorSchema,
	type validateMorphSchema,
	type validateValidatorSchema,
	type ValidatorKind,
	type ValidatorSchema
} from "./morph.js"

export type UnionChildKind = "morph" | ValidatorKind

export type BranchSchema = Schema<UnionChildKind>

export type BranchNode = Node<UnionChildKind>

export type validateBranchSchema<schema> = conform<
	schema,
	"morph" extends keyof schema
		? validateMorphSchema<schema>
		: validateValidatorSchema<schema>
>

export type parseUnion<branches extends readonly unknown[]> =
	branches["length"] extends 0
		? UnionNode<never>
		: branches["length"] extends 1
		? parseBranchSchema<branches[0]>
		: Root<parseBranchSchema<branches[number]>["infer"]>

export type parseBranchSchema<schema> = schema extends MorphSchema
	? parseMorphSchema<schema>
	: schema extends ValidatorSchema
	? parseValidatorSchema<schema>
	: BranchNode

export const parseBranchSchema = (schema: BranchSchema) =>
	typeof schema === "object" && "morph" in schema
		? MorphNode.parse(schema)
		: parseValidatorSchema(schema)

export type ExpandedUnionSchema<
	branches extends readonly BranchSchema[] = readonly BranchSchema[]
> = withAttributes<{
	readonly union: branches
	readonly ordered?: boolean
}>

export type UnionSchema = readonly BranchSchema[] | ExpandedUnionSchema

export type UnionInner = withAttributes<{
	readonly union: readonly BranchNode[]
	readonly ordered: boolean
}>

export type UnionDeclaration = declareNode<{
	kind: "union"
	schema: UnionSchema
	inner: UnionInner
	intersections: {
		union: "union" | Disjoint
		morph: "union" | Disjoint
		intersection: "union" | Disjoint
		rule: "union" | Disjoint
	}
	reductions: "union" | UnionChildKind
}>

export class UnionNode<t = unknown> extends BaseRoot<UnionDeclaration, t> {
	static readonly kind = "union"
	static readonly declaration: UnionDeclaration

	private static intersectBranch = (
		l: UnionNode,
		r: BranchNode
	): Disjoint | UnionInner => {
		const union = l.ordered
			? l.union.flatMap((branch) => {
					const branchResult = branch.intersect(r)
					return branchResult instanceof Disjoint ? [] : branchResult
			  })
			: intersectBranches(l.union, [r])
		if (union instanceof Disjoint) {
			return union
		}
		return { union, ordered: l.ordered }
	}

	static readonly definition = this.define({
		kind: "union",
		keys: {
			union: {
				children: (branches) => branches
			},
			ordered: {}
		},
		intersections: {
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
				let resultBranches: readonly BranchNode[] | Disjoint
				if (l.ordered) {
					if (r.ordered) {
						return Disjoint.from("indiscriminableMorphs", l, r)
					}
					resultBranches = intersectBranches(r.union, l.union)
					if (resultBranches instanceof Disjoint) {
						resultBranches.invert()
					}
				} else {
					resultBranches = intersectBranches(l.union, r.union)
				}
				if (resultBranches instanceof Disjoint) {
					return resultBranches
				}
				return { union: resultBranches, ordered: l.ordered || r.ordered }
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
							union: branches,
							ordered: l.ordered
					  }
			}
		},
		parseSchema: (schema) => {
			const result = {} as mutable<UnionInner>
			let schemaBranches: readonly BranchSchema[]
			if (isArray(schema)) {
				schemaBranches = schema
			} else {
				const { union: branches, ...attributes } = schema
				Object.assign(result, attributes)
				schemaBranches = branches
			}
			result.union = schemaBranches.map(parseBranchSchema)
			return result
		},
		reduceToNode: (inner) => {
			const reducedBranches = reduceBranches(inner.union)
			if (reducedBranches.length === 1) {
				// TODO: description?
				return reducedBranches[0]
			}
			return new UnionNode({ ...inner, union: reducedBranches })
		},
		compileCondition: (inner) => {
			let condition = inner.union
				.map((branch) => branch.condition)
				.join(") || (")
			if (inner.union.length > 1) {
				condition = `(${condition})`
			}
			return condition || "false"
		},
		writeDefaultDescription: (inner) =>
			inner.union.length === 0 ? "never" : inner.union.join(" or "),
		children: (inner) => inner.union
	})

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
}

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

export const reduceBranches = (branches: readonly BranchNode[]) => {
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
