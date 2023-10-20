import type { conform, listable } from "@arktype/util"
import {
	domainOf,
	hasKey,
	isKeyOf,
	listFrom,
	throwInternalError,
	throwParseError,
	transform
} from "@arktype/util"
import type { Out } from "arktype/internal/parser/tuple.js"
import { type BasisKind } from "../constraints/basis.js"
import { type ConstraintKind } from "../constraints/constraint.js"
import { DomainNode } from "../constraints/domain.js"
import { ProtoNode } from "../constraints/proto.js"
import type { RefinementKind } from "../constraints/refinement.js"
import { UnitNode } from "../constraints/unit.js"
import { Disjoint } from "../disjoint.js"
import type {
	BaseAttributes,
	Children,
	Node,
	Schema,
	StaticBaseNode
} from "../node.js"
import { baseAttributeKeys, BaseNode } from "../node.js"
import { inferred } from "../utils.js"
import type {
	BasisedBranchInput,
	IntersectionChildren,
	IntersectionSchema,
	IrreducibleConstraintKind,
	parseIntersection,
	UnknownBranchInput,
	validateIntersectionInput
} from "./intersection.js"
import {
	intersectionChildClasses,
	irreducibleChildClasses,
	reducibleChildClasses
} from "./intersection.js"
import type {
	MorphChildren,
	MorphSchema,
	parseMorph,
	validateMorphInput
} from "./morph.js"
import type {
	BranchNode,
	BranchSchema,
	UnionChildren,
	UnionSchema
} from "./union.js"

const createBranches = (branches: readonly BranchSchema[]) =>
	branches.map((branch) =>
		typeof branch === "object" && hasKey(branch, "morphs")
			? MorphNode.from(branch)
			: IntersectionNode.from(branch)
	)

export type TypeNode<t = unknown> = BaseType<t, {}, any>

export abstract class BaseType<
	t,
	children extends BaseAttributes,
	nodeClass extends StaticBaseNode<children>
> extends BaseNode<children, nodeClass> {
	abstract kind: TypeKind

	declare infer: t;
	declare [inferred]: t
	condition = ""

	constrain<kind extends ConstraintKind>(kind: kind, definition: Schema<kind>) {
		return this
	}

	extractUnit(): UnitNode | undefined {
		return this.hasKind("intersection") ? this.get("unit") : undefined
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

	or<other extends TypeNode>(other: other): TypeNode<t | other["infer"]> {
		return this as never
	}

	intersect<other extends TypeNode>(
		other: other
	): Node<intersectTypeKinds<this["kind"], other["kind"]>> | Disjoint {
		const result = intersectTypeNodes(this as never, other as never)
		if (result instanceof Disjoint || result instanceof BaseType) {
			// if the result is already instantiated (as opposed to a children object),
			// we don't want to add metadata
			return result as never
		}
		// TODO: meta
		return "branches" in result
			? new UnionNode(result)
			: "morph" in result
			? new MorphNode(result)
			: (new IntersectionNode(result) as any)
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") ? this.constraints.length === 0 : false
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") ? this.branches.length === 0 : false
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

export type TypeInput = listable<IntersectionSchema | MorphSchema>

export class UnionNode<t = unknown> extends BaseType<
	t,
	UnionChildren,
	typeof UnionNode
> {
	readonly kind = "union"

	static keyKinds = this.declareKeys({
		branches: "in"
	})

	constructor(children: UnionChildren) {
		super(children)
	}

	static from(schema: UnionSchema) {
		return new UnionNode({
			...schema,
			branches: createBranches(schema.branches)
		})
	}

	static writeDefaultDescription(children: UnionChildren) {
		return children.branches.length === 0
			? "never"
			: children.branches.join(" or ")
	}

	intersectSymmetric(other: UnionNode) {
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
		return finalizeBranchIntersection(
			intersectBranches(this.branches, other.branches)
		)
	}
}

const finalizeBranchIntersection = (
	resultBranches: ReturnType<typeof intersectBranches>
): UnionChildren | BranchNode | Disjoint =>
	resultBranches instanceof Disjoint
		? resultBranches
		: resultBranches.length === 1
		? resultBranches[0]
		: { branches: resultBranches }

const intersectTypeNodes = (
	l: Node<TypeKind>,
	r: Node<TypeKind>
): Children<TypeKind> | Disjoint => {
	if (l.kind === "union") {
		if (r.kind === "union") {
			return l.intersectSymmetric(r)
		}
		return finalizeBranchIntersection(intersectBranches(l.branches, [r]))
	}
	if (r.kind === "union") {
		return finalizeBranchIntersection(intersectBranches([l], r.branches))
	}
	return intersectBranchNodes(l, r)
}

const intersectBranchNodes = (
	l: BranchNode,
	r: BranchNode
): Children<"intersection" | "morph"> | Disjoint => {
	if (l.kind === "intersection") {
		if (r.kind === "intersection") {
			return l.intersectSymmetric(r)
		}
		const inTersection = r.in ? l.intersect(r.in) : l
		return inTersection instanceof Disjoint
			? inTersection
			: {
					...r.children,
					in: inTersection
			  }
	}
	if (r.kind === "morph") {
		return l.intersectSymmetric(r)
	}
	const inTersection = l.in?.intersect(r) ?? r
	return inTersection instanceof Disjoint
		? inTersection
		: {
				...l.children,
				in: inTersection
		  }
}

export class MorphNode<i = any, o = unknown> extends BaseType<
	(In: i) => Out<o>,
	MorphChildren,
	typeof MorphNode
> {
	readonly kind = "morph"

	static keyKinds = this.declareKeys({
		in: "in",
		out: "out",
		morph: "morph"
	})

	constructor(children: MorphChildren) {
		super(children)
	}

	static writeDefaultDescription(children: MorphChildren) {
		return ""
	}

	static from(schema: MorphSchema) {
		const children = {} as MorphChildren
		children.morph =
			typeof schema.morph === "function" ? [schema.morph] : schema.morph
		if (schema.in) {
			children.in = IntersectionNode.from(schema.in)
		}
		if (schema.out) {
			children.out = IntersectionNode.from(schema.out)
		}
		return new MorphNode(children)
	}

	intersectSymmetric(other: MorphNode): MorphChildren | Disjoint {
		if (this.morph.some((morph, i) => morph !== other.morph[i])) {
			// TODO: is this always a parse error? what about for union reduction etc.
			return throwParseError(`Invalid intersection of morphs`)
		}
		const result: MorphChildren = {
			morph: this.morph
		}
		if (this.in) {
			if (other.in) {
				const inTersection = this.in.intersect(other.in)
				if (inTersection instanceof Disjoint) {
					return inTersection
				}
				result.in = inTersection
			} else {
				result.in = this.in
			}
		} else if (other.in) {
			result.in = other.in
		}
		if (this.out) {
			if (other.out) {
				const outTersection = this.out.intersect(other.out)
				if (outTersection instanceof Disjoint) {
					return outTersection
				}
				result.out = outTersection
			} else {
				result.out = this.out
			}
		} else if (other.out) {
			result.out = other.out
		}
		return result
	}
}

export class IntersectionNode<t = unknown> extends BaseType<
	t,
	IntersectionChildren,
	typeof IntersectionNode
> {
	readonly kind = "intersection"

	static keyKinds = this.declareKeys(
		transform(intersectionChildClasses, ([kind]) => [kind, "in"] as const)
	)

	declare constraints: readonly Node<ConstraintKind>[]
	declare refinements: readonly Node<RefinementKind>[]
	basis: Node<BasisKind> | undefined

	constructor(children: IntersectionChildren) {
		const rawConstraints = flattenConstraints(children)
		const reducedConstraints = intersectConstraints([], rawConstraints)
		if (reducedConstraints instanceof Disjoint) {
			return reducedConstraints.throw()
		}
		let reducedChildren = children
		if (reducedConstraints.length < rawConstraints.length) {
			reducedChildren = unflattenConstraints(reducedConstraints)
			if ("alias" in children) {
				reducedChildren.alias = children.alias
			}
			if ("description" in children) {
				reducedChildren.description = children.description
			}
		}
		super(reducedChildren)
		this.constraints = reducedConstraints
		this.basis = this.constraints[0]?.isBasis()
			? (this.constraints[0] as never)
			: undefined
		this.refinements = (
			this.constraints[0]?.isBasis()
				? this.constraints.slice(1)
				: this.constraints
		) as never
		assertValidRefinements(this.basis, this.refinements)
	}

	static from(schema: IntersectionSchema) {
		const children = parseIntersectionChildren(schema)
		return new IntersectionNode(children)
	}

	static writeDefaultDescription(children: IntersectionChildren) {
		const constraints = flattenConstraints(children)
		return constraints.length === 0 ? "a value" : constraints.join(" and ")
	}

	intersectSymmetric(other: IntersectionNode): IntersectionChildren | Disjoint {
		const constraints = intersectConstraints(
			this.constraints,
			other.constraints
		)
		return constraints instanceof Disjoint
			? constraints
			: unflattenConstraints(constraints)
	}

	filter<kind extends ConstraintKind>(kind: kind): Node<kind>[] {
		return this.constraints.filter(
			(node): node is Node<kind> => node.kind === kind
		)
	}

	get<kind extends ConstraintKind>(
		kind: kind
	):
		| (kind extends IrreducibleConstraintKind ? Node<kind>[] : Node<kind>)
		| undefined
	get(kind: ConstraintKind) {
		const constraintsOfKind = this.filter(kind)
		if (constraintsOfKind.length === 0) {
			return
		}
		return isKeyOf(kind, irreducibleChildClasses)
			? constraintsOfKind
			: constraintsOfKind[0]
	}
}

const flattenConstraints = (children: IntersectionChildren) =>
	Object.values(children)
		.flat()
		.filter((v): v is Node<ConstraintKind> => v instanceof BaseNode)

const unflattenConstraints = (constraints: readonly Node<ConstraintKind>[]) => {
	return constraints.reduce<IntersectionChildren>((result, node) => {
		if (isKeyOf(node.kind, irreducibleChildClasses)) {
			const existing = result[node.kind] as
				| Node<IrreducibleConstraintKind>[]
				| undefined
			if (existing) {
				existing.push(node as never)
			} else {
				result[node.kind] = [node as never]
			}
		} else if (result[node.kind]) {
			throwInternalError(
				`Unexpected intersection of children of kind ${node.kind}`
			)
		} else {
			result[node.kind] = node as never
		}
		return result
	}, {})
}

const intersectConstraints = (
	l: readonly Node<ConstraintKind>[],
	r: readonly Node<ConstraintKind>[]
) => {
	let constraints: Node<ConstraintKind>[] | Disjoint = [...l]
	for (const constraint of r) {
		if (constraints instanceof Disjoint) {
			break
		}
		constraints = addConstraint(constraints, constraint)
	}
	return constraints
}

const addConstraint = (
	constraints: readonly Node<ConstraintKind>[],
	constraint: Node<ConstraintKind>
): Node<ConstraintKind>[] | Disjoint => {
	const result: Node<ConstraintKind>[] = []
	let includesConstraint = false
	for (let i = 0; i < constraints.length; i++) {
		const elementResult = constraint.intersect(constraints[i])
		if (elementResult === null) {
			result.push(constraints[i])
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
		result.push(constraint)
	}
	return result
}

const assertValidRefinements: (
	basis: Node<BasisKind> | undefined,
	refinements: readonly Node<RefinementKind>[]
) => asserts refinements is Node<RefinementKind>[] = (basis, refinements) => {
	for (const refinement of refinements) {
		if (!refinement.applicableTo(basis)) {
			throwParseError(refinement.writeInvalidBasisMessage(basis))
		}
	}
}

const parseIntersectionChildren = (
	schema: IntersectionSchema
): IntersectionChildren => {
	switch (typeof schema) {
		case "string":
			return { domain: DomainNode.from(schema) }
		case "function":
			return { proto: ProtoNode.from(schema) }
		case "object":
			if ("is" in schema) {
				return { unit: UnitNode.from(schema) }
			}
			return parseIntersectionObjectSchema(schema)
		default:
			return throwParseError(
				`${domainOf(schema)} is not a valid intersection schema input.`
			)
	}
}

const parseIntersectionObjectSchema = (
	schema: UnknownBranchInput | BasisedBranchInput
) =>
	transform(schema as BasisedBranchInput, ([k, v]) =>
		isKeyOf(k, irreducibleChildClasses)
			? [
					k,
					listFrom(v).map((childSchema) =>
						irreducibleChildClasses[k].from(childSchema as never)
					)
			  ]
			: isKeyOf(k, reducibleChildClasses)
			? [k, (reducibleChildClasses[k].from as any)(v)]
			: isKeyOf(k, baseAttributeKeys)
			? [k, v]
			: throwParseError(`'${k}' is not valid on an intersection schema`)
	)

const parseNode = (...schemas: BranchSchema[]) => {
	const branches = createBranches(schemas)
	// DO reduce bitach
	if (branches.length === 1) {
		return branches[0]
	}
	return new UnionNode({ branches })
}

const parseUnits = (...values: unknown[]) => {
	// TODO: unique list, bypass validation
	const branches = values.map(
		(value) => new IntersectionNode({ unit: new UnitNode({ rule: value }) })
	)
	if (branches.length === 1) {
		return branches[0]
	}
	return new UnionNode({ branches })
}

export const node = Object.assign(parseNode as NodeParser, {
	units: parseUnits as UnitsNodeParser
})

type NodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchInput<branches[i]>
		}
	): parseNode<branches>
}

type parseNode<branches extends readonly unknown[]> = {
	[i in keyof branches]: parseBranch<branches[i]>
}[number] extends infer t
	? branches["length"] extends 1
		? t
		: TypeNode<t>
	: never

export type validateBranchInput<input> = conform<
	input,
	"morphs" extends keyof input
		? validateMorphInput<input>
		: validateIntersectionInput<input>
>

type parseBranch<branch> = branch extends MorphSchema
	? parseMorph<branch>
	: branch extends IntersectionSchema
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
	? // if either branch could be a union, the result could be
	  // any kind depending on how it's reduced
	  TypeKind
	: // if either branch is exactly "morph", we know the result will
	// also be a morph
	l extends "morph"
	? "morph"
	: r extends "morph"
	? "morph"
	: // otherwise, it is an intersection or possibly a morph depending
	  // on unknown kind inputs (e.g. BranchNode)
	  l | r

export type TypeClassesByKind = {
	union: typeof UnionNode
	morph: typeof MorphNode
	intersection: typeof IntersectionNode
}

export type TypeKind = keyof TypeClassesByKind

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
