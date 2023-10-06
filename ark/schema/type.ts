import type { conform, Dict, extend, Hkt, satisfy } from "@arktype/util"
import { DynamicBase, reify } from "@arktype/util"
import type {
	ConstraintClassesByKind,
	ConstraintInputsByKind,
	ConstraintKind,
	ConstraintNode,
	ConstraintsByKind
} from "./constraints/constraint.js"
import type { UnitNode } from "./constraints/unit.js"
import { Disjoint } from "./disjoint.js"
import type {
	IntersectionInput,
	IntersectionNode,
	parseIntersection,
	validateIntersectionInput
} from "./intersection.js"
import type {
	MorphInput,
	MorphNode,
	parseMorph,
	validateMorphInput
} from "./morph.js"

export interface BaseAttributes {
	alias?: string
	description?: string
}

export abstract class TypeNode<
	t = unknown,
	schema extends BaseAttributes = BaseAttributes
> extends DynamicBase<schema> {
	abstract kind: NodeKind

	declare infer: t;
	declare [inferred]: t
	declare condition: string

	description: string
	alias: string

	protected constructor(public schema: schema) {
		super(schema)
		this.description ??= this.writeDefaultDescription()
		this.alias ??= "generated"
	}

	abstract inId: string
	abstract outId: string
	abstract typeId: string
	metaId = this.writeMetaId()

	private writeMetaId() {
		return JSON.stringify({
			type: this.typeId,
			description: this.description,
			alias: this.alias
		})
	}

	abstract writeDefaultDescription(): string
	abstract branches: readonly BranchNode[]
	declare children: TypeNode[]

	equals(other: TypeNode) {
		return this.typeId === other.typeId
	}

	constrain<kind extends ConstraintKind>(
		kind: kind,
		definition: inputOf<kind>
	): TypeNode<t> {
		return this
	}

	extractUnit(): UnitNode | undefined {
		return this.branches.length === 1 &&
			this.branches[0].kind === "intersection"
			? this.branches[0].extractUnit()
			: undefined
	}

	// references() {
	// 	return this.branches.flatMap((branch) => branch.references())
	// }

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

	// TODO: inferIntersection
	and<other extends TypeNode>(other: other): TypeNode<t & other["infer"]> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	intersect<other extends TypeNode>(
		other: other
	): Node<intersectNodeKinds<this["kind"], other["kind"]>> | Disjoint {
		const resultBranches = intersectBranches(this.branches, other.branches)
		if (resultBranches.length === 0) {
			return Disjoint.from("union", this.branches, other.branches)
		}
		return node(...(resultBranches as any)) as never
	}

	or<other extends TypeNode>(other: other): TypeNode<t | other["infer"]> {
		return this
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === kind
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") ? this.constraints.length === 0 : false
	}

	isNever(): this is UnionNode<never> {
		return this.branches.length === 0
	}

	getPath() {
		return this
	}

	array(): TypeNode<t[]> {
		return node()
	}

	extends<other>(other: TypeNode<other>): this is TypeNode<other> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}
}

type intersectNodeKinds<l extends NodeKind, r extends NodeKind> = [
	l,
	r
] extends ["unit", unknown] | [unknown, "unit"]
	? "unit"
	: "union" extends l | r
	? NodeKind
	: "morph" extends l | r
	? "morph"
	: "intersection" | ((l | r) & ConstraintKind)

export type nodeParser<node extends { hkt: Hkt }> = reify<node["hkt"]>

export const nodeParser = <node extends { hkt: Hkt }>(node: node) =>
	reify(node.hkt) as nodeParser<node>

export type parseNode<
	node extends { hkt: Hkt },
	parameters extends Parameters<node["hkt"]["f"]>[0]
> = Hkt.apply<node["hkt"], parameters>

export type CompositeInputsByKind = satisfy<
	Dict<CompositeKind>,
	{
		union: UnionInput
		intersection: IntersectionInput
		morph: MorphInput
	}
>

export type NodeInputsByKind = extend<
	CompositeInputsByKind,
	ConstraintInputsByKind
>

export type inputOf<kind extends NodeKind> = NodeInputsByKind[kind]

export type CompositeClassesByKind = satisfy<
	Dict<CompositeKind>,
	{
		union: typeof UnionNode
		morph: typeof MorphNode
		intersection: typeof IntersectionNode
	}
>

export type NodeClassesByKind = extend<
	ConstraintClassesByKind,
	CompositeClassesByKind
>

export type CompositeNodesByKind = {
	union: UnionNode
	intersection: IntersectionNode
	morph: MorphNode
}

export type CompositeKind = keyof CompositeNodesByKind

export type NodesByKind = extend<ConstraintsByKind, CompositeNodesByKind>

export type NodeKind = keyof NodesByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

// Unions
import { inferred } from "./utils.js"

export interface TypeSchema extends BaseAttributes {
	branches: readonly BranchNode[]
}

export type BranchNode = IntersectionNode | MorphNode | ConstraintNode

export interface UnionInput extends BaseAttributes {
	branches: readonly BranchInput[]
}

export type BranchInput = IntersectionInput | MorphInput

export class UnionNode<t = unknown> extends TypeNode<t, TypeSchema> {
	readonly kind = "union"

	branches = this.schema.branches

	inId = this.branches.map((constraint) => constraint.inId).join("|")
	outId = this.branches.map((constraint) => constraint.outId).join("|")
	typeId = this.branches.map((constraint) => constraint.typeId).join("|")
	metaId = this.branches.map((constraint) => constraint.metaId).join("|")

	writeDefaultDescription() {
		return this.branches.length === 0 ? "never" : this.branches.join(" or ")
	}
}

// // discriminate is cached so we don't have to worry about this running multiple times
// get discriminant() {
// 	return discriminate(this.branches)
// }

export const reduceBranches = (branches: IntersectionNode[]) => {
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
	l: readonly BranchNode[],
	r: readonly BranchNode[]
): readonly BranchNode[] => {
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

type NodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchInput<branches[i]>
		}
	): TypeNode<
		{
			[i in keyof branches]: parseBranch<branches[i]>["infer"]
		}[number]
	>
}

type validateBranchInput<input> = conform<
	input,
	"morphs" extends keyof input
		? validateMorphInput<input>
		: validateIntersectionInput<input>
>

type parseBranch<branch> = branch extends MorphInput
	? parseMorph<branch>
	: branch extends IntersectionInput
	? parseIntersection<branch>
	: IntersectionNode

type UnitsNodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: branches
	): TypeNode<branches[number]>
}

const from = ((...branches: BranchInput[]) =>
	new (UnionNode as any)({ branches })) as {} as NodeParser

const fromUnits = ((...branches: never[]) =>
	new (UnionNode as any)({ branches })) as {} as UnitsNodeParser

export const node = Object.assign(from, {
	units: fromUnits
})
