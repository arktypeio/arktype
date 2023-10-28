import type {
	conform,
	evaluate,
	extend,
	instanceOf,
	listable,
	mutable
} from "@arktype/util"
import { hasDomain } from "@arktype/util"
import { type BasisKind } from "./constraints/basis.js"
import type {
	ConstraintDeclarationsByKind,
	ConstraintKind
} from "./constraints/constraint.js"
import { UnitNode } from "./constraints/unit.js"
import {
	type IntersectionDeclaration,
	IntersectionNode,
	type IntersectionSchema,
	type parseIntersection,
	type validateIntersectionInput
} from "./intersection.js"
import {
	type MorphDeclaration,
	MorphNode,
	type MorphSchema,
	type parseMorph,
	type validateMorphInput
} from "./morph.js"
import {
	type BranchSchema,
	type ExpandedUnionSchema,
	type UnionDeclaration,
	type UnionInner,
	UnionNode
} from "./union.js"
import { type inferred } from "./utils.js"

export type NodeInput = listable<IntersectionSchema | MorphSchema>

const parseNode: TypeNodeParser = (
	...schemas: [ExpandedUnionSchema] | BranchSchema[]
) => {
	const result = {} as mutable<UnionInner>
	let schemaBranches: readonly BranchSchema[]
	if (hasDomain(schemas[0], "object") && "branches" in schemas[0]) {
		const { branches, ...attributes } = schemas[0]
		Object.assign(result, attribute)
		schemaBranches = branches
	} else {
		schemaBranches = schemas
	}
	result.branches = schemaBranches.map((branch) =>
		typeof branch === "object" && "morph" in branch
			? new MorphNode(branch)
			: new IntersectionNode(branch)
	)
	return new UnionNode(result)
}

type TypeNodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchInput<branches[i]>
		}
	): Root<inferNodeBranches<branches>>
}

// const parseKind = <kind extends NodeKind, schema extends Schema<kind>>(
// 	kind: kind,
// 	schema: schema
// ) => new TypeNode(kind, schema) as Node<kind, unknown>

const parseUnits = <const branches extends readonly unknown[]>(
	...values: branches
) => {
	const uniqueValues: unknown[] = []
	for (const value of values) {
		if (!uniqueValues.includes(value)) {
			uniqueValues.push(value)
		}
	}
	// TODO: bypass reduction
	return new UnionNode<branches[number]>({
		branches: uniqueValues.map((unit) => new UnitNode({ unit }))
	})
}

export const node = Object.assign(parseNode, {
	units: parseUnits
	// kind: parseKind
})

export type RootInput = listable<IntersectionSchema | MorphSchema>

export type inferNodeBranches<branches extends readonly unknown[]> = {
	[i in keyof branches]: parseBranch<branches[i]>
}[number]

export type validateBranchInput<input> = conform<
	input,
	"morphs" extends keyof input
		? validateMorphInput<input>
		: validateIntersectionInput<input>
>

export type parseBranch<branch> = branch extends MorphSchema
	? parseMorph<branch>
	: branch extends IntersectionSchema
	? parseIntersection<branch>
	: unknown

type reifyIntersections<lKind extends NodeKind, intersectionMap> = {
	[rKind in keyof intersectionMap]: (
		l: Node<lKind>,
		r: Node<intersectionGroupOf<rKind>>
	) => reifyIntersectionResult<intersectionMap[rKind]>
}

type intersectionGroupOf<rKind> = rKind extends NodeKind
	? rKind
	: rKind extends "constraint"
	? ConstraintKind
	: never

type reifyIntersectionResult<result> = result extends NodeKind
	? Inner<result>
	: result

export type TypeDeclarationsByKind = {
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
}

export type TypeKind = evaluate<keyof TypeDeclarationsByKind>

export type RootKind = TypeKind | BasisKind

export type NodeDeclarationsByKind = extend<
	ConstraintDeclarationsByKind,
	TypeDeclarationsByKind
>

export type NodeKind = keyof NodeDeclarationsByKind

export type NodeClass<kind extends NodeKind = NodeKind> =
	NodeDeclarationsByKind[kind]["class"]
5
export type Schema<kind extends NodeKind> =
	NodeDeclarationsByKind[kind]["schema"]

export type Inner<kind extends NodeKind> = NodeDeclarationsByKind[kind]["inner"]

export type OwnIntersections<kind extends NodeKind> = reifyIntersections<
	kind,
	NodeDeclarationsByKind[kind]["intersections"]
>

export type Node<kind extends NodeKind = NodeKind> = instanceOf<
	NodeDeclarationsByKind[kind]["class"]
>

export type Root<t = unknown, kind extends RootKind = RootKind> = Node<kind> & {
	[inferred]: t
}
