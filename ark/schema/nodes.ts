import type { extend, listable } from "@arktype/util"
import { BaseNode, type rightOf } from "./base.js"
import {
	type BasisClassesByKind,
	type BasisDeclarationsByKind
} from "./bases/basis.js"
import {
	type ConstraintDeclarationsByKind,
	type ConstraintImplementationByKind
} from "./constraints/constraint.js"
import { type MorphSchema, type ValidatorSchema } from "./sets/morph.js"
import {
	type SetClassesByKind,
	type SetDeclarationsByKind
} from "./sets/set.js"
import {
	type BranchSchema,
	type parseUnion,
	type validateBranchSchema
} from "./sets/union.js"

type RootNodeParser = {
	<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchSchema<branches[i]>
		}
	): parseUnion<branches>
}

const parseNode = (...schemas: BranchSchema[]) => new UnionNode(schemas)

export const parseKind = <kind extends NodeKind>(
	kind: kind,
	schema: Schema<kind>
): Node<kind> => new (BaseNode.classesByKind[kind] as any)(schema)

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
		union: uniqueValues.map((unit) => new UnitNode({ unit })),
		ordered: false
	})
}

export const node = Object.assign(parseNode as RootNodeParser, {
	units: parseUnits,
	kind: parseKind
})

export type RootInput = listable<ValidatorSchema | MorphSchema>

export type reifyIntersections<lKind extends NodeKind, intersectionMap> = {
	[rKind in keyof intersectionMap]: rKind extends "default"
		? (
				l: Node<lKind>,
				r: Node<Exclude<rightOf<lKind>, keyof intersectionMap>>
		  ) => reifyIntersectionResult<intersectionMap[rKind]>
		: (
				l: Node<lKind>,
				r: Node<rKind & NodeKind>
		  ) => reifyIntersectionResult<intersectionMap[rKind]>
}

type reifyIntersectionResult<result> = result extends NodeKind
	? Inner<result>
	: result

export type RuleDeclarationsByKind = extend<
	BasisDeclarationsByKind,
	ConstraintDeclarationsByKind
>

export type RuleClassesByKind = extend<
	BasisClassesByKind,
	ConstraintImplementationByKind
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

export type LeftIntersections<kind extends NodeKind> = reifyIntersections<
	kind,
	NodeDeclarationsByKind[kind]["intersections"]
>

export type Node<
	kind extends NodeKind = NodeKind,
	t = unknown
> = kind extends NodeKind ? BaseNode<kind, t> : never
