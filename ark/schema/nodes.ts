import type { extend, instanceOf, listable } from "@arktype/util"
import { BaseNode } from "./base.js"
import {
	type BasisClassesByKind,
	type BasisDeclarationsByKind
} from "./bases/basis.js"
import { UnitNode } from "./bases/unit.js"
import {
	type ConstraintClassesByKind,
	type ConstraintDeclarationsByKind
} from "./constraints/constraint.js"
import {
	type MorphSchema,
	type parseValidatorSchema,
	type ValidatorSchema
} from "./sets/morph.js"
import {
	type SetClassesByKind,
	type SetDeclarationsByKind
} from "./sets/set.js"
import {
	type BranchSchema,
	type parseBranchSchema,
	UnionNode,
	type validateBranchSchema
} from "./sets/union.js"

type RootNodeParser = {
	<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchSchema<branches[i]>
		}
	): parseBranchSchema<branches[number]>
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

const parseNode = (...schemas: BranchSchema[]) => UnionNode.parse(schemas)

const parseKind = <kind extends NodeKind>(kind: kind, schema: Schema<kind>) =>
	BaseNode.classesByKind[kind].parse(schema) as reducibleParseResult<kind>

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
	units: parseUnits,
	kind: parseKind
})

export type RootInput = listable<ValidatorSchema | MorphSchema>

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

export type RuleClassesByKind = extend<
	BasisClassesByKind,
	ConstraintClassesByKind
>

export type RuleKind = keyof RuleDeclarationsByKind

export type NodeDeclarationsByKind = extend<
	RuleDeclarationsByKind,
	SetDeclarationsByKind
>

export type NodeKind = keyof NodeDeclarationsByKind

export type NodeClassesByKind = extend<RuleClassesByKind, SetClassesByKind>

export type NodeClass<kind extends NodeKind = NodeKind> =
	NodeClassesByKind[kind]

export type Schema<kind extends NodeKind> =
	NodeDeclarationsByKind[kind]["schema"]

export type DiscriminableSchemasByKind = {
	[k in NodeKind]: Extract<Schema<k>, { [_ in k]: unknown }>
}

export type DiscriminableSchema<kind extends NodeKind = NodeKind> =
	DiscriminableSchemasByKind[kind]

export type Inner<kind extends NodeKind> = NodeDeclarationsByKind[kind]["inner"]

export type reducibleParseResult<kind extends NodeKind> = Node<
	NodeDeclarationsByKind[kind]["reductions"]
>

export type LeftIntersections<kind extends NodeKind> = reifyIntersections<
	kind,
	NodeDeclarationsByKind[kind]["intersections"]
>

export type Node<kind extends NodeKind = NodeKind> = instanceOf<NodeClass<kind>>
