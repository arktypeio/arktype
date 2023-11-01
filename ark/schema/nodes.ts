import type {
	conform,
	extend,
	instanceOf,
	listable,
	mutable
} from "@arktype/util"
import { hasDomain } from "@arktype/util"
import { type BasisDeclarationsByKind } from "./bases/basis.js"
import { UnitNode } from "./bases/unit.js"
import { type ConstraintDeclarationsByKind } from "./constraints/constraint.js"
import { type Root } from "./root.js"
import {
	IntersectionNode,
	type IntersectionSchema,
	type parseIntersection,
	type validateIntersectionInput
} from "./sets/intersection.js"
import {
	MorphNode,
	type MorphSchema,
	type parseMorph,
	type validateMorphInput
} from "./sets/morph.js"
import { type SetDeclarationsByKind } from "./sets/set.js"
import {
	type BranchSchema,
	type ExpandedUnionSchema,
	type UnionInner,
	UnionNode
} from "./sets/union.js"

type RootNodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchInput<branches[i]>
		}
	): Root<inferNodeBranches<branches>>
}

// static from<const branches extends readonly unknown[]>(
// 	schema: {
// 		branches: {
// 			[i in keyof branches]: validateBranchInput<branches[i]>
// 		}
// 	} & ExpandedUnionSchema
// ) {
// 	return new UnionNode<inferNodeBranches<branches>>({
// 		...schema,
// 		branches: schema.branches.map((branch) => branch as never)
// 	})
// }

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

const parseNode = (...schemas: BranchSchema[]) => UnionNode.parse(schemas)

export const node = Object.assign(parseNode as RootNodeParser, {
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
	? RuleKind
	: never

type reifyIntersectionResult<result> = result extends NodeKind
	? Inner<result>
	: result

export type RuleDeclarationsByKind = extend<
	BasisDeclarationsByKind,
	ConstraintDeclarationsByKind
>

export type RuleKind = keyof RuleDeclarationsByKind

export type NodeDeclarationsByKind = extend<
	RuleDeclarationsByKind,
	SetDeclarationsByKind
>

export type NodeKind = keyof NodeDeclarationsByKind

export type NodeClass<kind extends NodeKind = NodeKind> =
	NodeDeclarationsByKind[kind]["class"]
5
export type Schema<kind extends NodeKind> =
	NodeDeclarationsByKind[kind]["schema"]

export type Inner<kind extends NodeKind> = NodeDeclarationsByKind[kind]["inner"]

export type LeftIntersections<kind extends NodeKind> = reifyIntersections<
	kind,
	NodeDeclarationsByKind[kind]["intersections"]
>

export type IntersectionMap<kind extends NodeKind> =
	NodeDeclarationsByKind[kind]["intersections"]

export type Node<kind extends NodeKind = NodeKind> = instanceOf<NodeClass<kind>>
