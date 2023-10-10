import {
	type conform,
	type Dict,
	entriesOf,
	type listable,
	type satisfy,
	throwInternalError
} from "@arktype/util"
import type {
	ConstraintInput,
	ConstraintKind,
	ConstraintNode
} from "../constraints/constraint.js"
import { DomainNode } from "../constraints/domain.js"
import { UnitNode } from "../constraints/unit.js"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes, Node } from "../node.js"
import { BaseNode } from "../node.js"
import { inferred } from "../utils.js"
import type {
	IntersectionInput,
	IntersectionSchema,
	parseIntersection,
	validateIntersectionInput
} from "./intersection.js"
import type {
	MorphInput,
	MorphNode,
	parseMorph,
	validateMorphInput
} from "./morph.js"
import type {
	BranchInput,
	BranchNode,
	UnionInput,
	UnionSchema
} from "./union.js"

export abstract class TypeNode<
	t = unknown,
	children extends BaseAttributes = BaseAttributes
> extends BaseNode<children> {
	abstract kind: TypeKind

	declare infer: t;
	declare [inferred]: t
	condition = ""

	description: string
	alias: string

	protected constructor(public schema: children) {
		super(schema)
		this.description ??= this.writeDefaultDescription()
		this.alias ??= "generated"
	}

	static from(
		// ensure "from" can't be accessed on subclasses since e.g. Union.from could create an Intersection
		this: typeof TypeNode,
		...branches: BranchInput[]
	) {
		const constraintSets = branches.map((branch) =>
			typeof branch === "string" ? new DomainNode("string") : {}
		)
		if (branches.length === 1) {
			return new IntersectionNode({
				constraints: entriesOf(branches[0] as never)
			})
		}
		return new UnionNode({ branches } as never)
	}

	static fromUnits(...branches: unknown[]) {
		return this.from(...branches.map((value) => new UnitNode({ unit: value })))
	}

	abstract branches: readonly BranchNode[]

	constrain<kind extends ConstraintKind>(
		kind: kind,
		definition: ConstraintInput<kind>
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
	): Node<intersectTypeKinds<this["kind"], other["kind"]>> | Disjoint {
		const resultBranches = intersectBranches(this.branches, other.branches)
		if (resultBranches.length === 0) {
			if (
				(this.branches.length === 0 || other.branches.length === 0) &&
				this.branches.length !== other.branches.length
			) {
				// if exactly one operand is never, we can use it to discriminate based on presence
				return Disjoint.from(
					"presence",
					this.branches.length !== 0,
					other.branches.length !== 0
				)
			}
			return Disjoint.from("union", this.branches, other.branches)
		}
		return this as never //node(...(resultBranches as any)) as never
	}

	or<other extends TypeNode>(other: other): TypeNode<t | other["infer"]> {
		return this
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
		return this as never
	}

	extends<other>(other: TypeNode<other>): this is TypeNode<other> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}
}

export type TypeInput = listable<IntersectionInput | MorphInput>

export class UnionNode<t = unknown> extends TypeNode<t, UnionSchema> {
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

export class IntersectionNode<t = unknown> extends TypeNode<
	t,
	IntersectionSchema
> {
	readonly kind = "intersection"

	inId = this.constraints.map((constraint) => constraint.inId).join("&")
	outId = this.constraints.map((constraint) => constraint.outId).join("&")
	typeId = this.constraints.map((constraint) => constraint.typeId).join("&")
	metaId = this.constraints.map((constraint) => constraint.metaId).join("&")

	branches = [this]

	writeDefaultDescription() {
		return this.constraints.length ? this.constraints.join(" and ") : "a value"
	}

	// intersect(other: PredicateNode) {
	// 	const schema: Partial<PredicateSchema> = {}
	// 	if (this.morphs.length) {
	// 		if (other.morphs.length) {
	// 			if (!this.morphs.every((morph, i) => morph === other.morphs[i])) {
	// 				throw new Error(`Invalid intersection of morphs.`)
	// 			}
	// 		}
	// 		schema.morphs = this.morphs
	// 	} else if (other.morphs.length) {
	// 		schema.morphs = other.morphs
	// 	}
	// 	let constraints: readonly Constraint[] | Disjoint = this.constraints
	// 	if (this.typeId !== other.typeId) {
	// 		for (const constraint of other.constraints) {
	// 			if (constraints instanceof Disjoint) {
	// 				break
	// 			}
	// 			constraints = this.addConstraint(constraint)
	// 		}
	// 		if (constraints instanceof Disjoint) {
	// 			return constraints
	// 		}
	// 	}
	// 	schema.constraints = constraints
	// 	const typeId = hashPredicateType(schema as PredicateSchema)
	// 	if (typeId === this.typeId) {
	// 		if (this.schema.description) {
	// 			schema.description = this.schema.description
	// 		}
	// 		if (this.schema.alias) {
	// 			schema.alias = this.schema.alias
	// 		}
	// 	}
	// 	if (typeId === other.typeId) {
	// 		if (other.schema.description) {
	// 			schema.description = other.schema.description
	// 		}
	// 		if (other.schema.alias) {
	// 			schema.alias = other.schema.alias
	// 		}
	// 	}
	// 	return new PredicateNode(schema as PredicateSchema)
	// }

	protected addConstraint(
		constraint: ConstraintNode
	): readonly ConstraintNode[] | Disjoint {
		const result: ConstraintNode[] = []
		let includesConstraint = false
		for (let i = 0; i < this.constraints.length; i++) {
			const elementResult = constraint.intersectConstraint(this.constraints[i])
			if (elementResult === null) {
				result.push(this.constraints[i])
			} else if (elementResult instanceof Disjoint) {
				return elementResult
			} else if (!includesConstraint) {
				result.push(elementResult)
				includesConstraint = true
			} else if (!result.includes(elementResult)) {
				return throwInternalError(
					`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
				)
			}
		}
		if (!includesConstraint) {
			result.push(this as never)
		}
		return result
	}
}

export const node = Object.assign(TypeNode.from as NodeParser, {
	units: TypeNode.fromUnits as UnitsNodeParser
})

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

export type validateBranchInput<input> = conform<
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

type intersectTypeKinds<
	l extends TypeKind,
	r extends TypeKind
> = "union" extends l | r
	? TypeKind
	: "morph" extends l | r
	? "morph"
	: "intersection"

export type TypeInputsByKind = satisfy<
	Dict<TypeKind>,
	{
		union: UnionInput
		intersection: IntersectionInput
		morph: MorphInput
	}
>

export type TypeClassesByKind = satisfy<
	Dict<TypeKind>,
	{
		union: typeof UnionNode
		morph: typeof MorphNode
		intersection: typeof IntersectionNode
	}
>

export type TypeNodesByKind = {
	union: UnionNode
	intersection: IntersectionNode
	morph: MorphNode
}

export type TypeKind = keyof TypeNodesByKind

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