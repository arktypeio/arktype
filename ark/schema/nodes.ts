import type { conform, extend, instanceOf, listable } from "@arktype/util"
import { type BasisDeclarationsByKind } from "./bases/basis.js"
import { UnitNode } from "./bases/unit.js"
import { type ConstraintDeclarationsByKind } from "./constraints/constraint.js"
import { type Root } from "./root.js"
import {
	type IntersectionSchema,
	type parseIntersection,
	type validateIntersectionSchema
} from "./sets/intersection.js"
import {
	type MorphSchema,
	type parseMorph,
	type validateMorphSchema
} from "./sets/morph.js"
import { type SetDeclarationsByKind } from "./sets/set.js"
import { type BranchNode, type BranchSchema, UnionNode } from "./sets/union.js"

type RootNodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchInput<branches[i]>
		}
	): parseNodeBranches<branches>
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

const parseNode = (...schemas: BranchSchema[]) => UnionNode.parse(schemas)

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
		union: uniqueValues.map((unit) => new UnitNode({ unit }))
	})
}

export const node = Object.assign(parseNode as RootNodeParser, {
	units: parseUnits
	// kind: parseKind
})

export type RootInput = listable<IntersectionSchema | MorphSchema>

export type parseNodeBranches<branches extends readonly unknown[]> =
	branches["length"] extends 0
		? UnionNode<never>
		: branches["length"] extends 1
		? parseBranch<branches[0]>
		: Root<
				{
					[i in keyof branches]: parseBranch<branches[i]>["infer"]
				}[number]
		  >

export type validateBranchInput<input> = conform<
	input,
	"morph" extends keyof input
		? validateMorphSchema<input>
		: validateIntersectionSchema<input>
>

export type parseBranch<input> = input extends MorphSchema
	? parseMorph<input>
	: input extends IntersectionSchema
	? parseIntersection<input>
	: BranchNode

export type reifyIntersections<lKind extends NodeKind, intersectionMap> = {
	[rKind in keyof intersectionMap]: (
		l: Node<lKind>,
		r: Node<intersectionGroupOf<rKind>>
	) => reifyIntersectionResult<intersectionMap[rKind]>
}

type intersectionGroupOf<rKind> = rKind extends NodeKind
	? rKind
	: rKind extends "rule"
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

export type DiscriminableSchemasByKind = {
	[k in NodeKind]: Extract<Schema<k>, { [_ in k]: unknown }>
}

export type DiscriminableSchema<kind extends NodeKind = NodeKind> =
	DiscriminableSchemasByKind[kind]

export type Inner<kind extends NodeKind> = NodeDeclarationsByKind[kind]["inner"]

export type LeftIntersections<kind extends NodeKind> = reifyIntersections<
	kind,
	NodeDeclarationsByKind[kind]["intersections"]
>

export type IntersectionMap<kind extends NodeKind> =
	NodeDeclarationsByKind[kind]["intersections"]

export type Node<kind extends NodeKind = NodeKind> = instanceOf<NodeClass<kind>>
