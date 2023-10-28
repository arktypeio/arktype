import type {
	conform,
	evaluate,
	extend,
	listable,
	mutable
} from "@arktype/util"
import { hasDomain } from "@arktype/util"
import {
	type BaseAttributes,
	type BaseNode,
	type StaticBaseNode
} from "./base.js"
import type { ConstraintClassesByKind } from "./constraints/constraint.js"
import { UnitNode } from "./constraints/unit.js"
import {
	IntersectionNode,
	type IntersectionSchema,
	type parseIntersection,
	type validateIntersectionInput
} from "./intersection.js"
import {
	MorphNode,
	type MorphSchema,
	type parseMorph,
	type validateMorphInput
} from "./morph.js"
import {
	type BranchSchema,
	type ExpandedUnionSchema,
	type UnionInner,
	UnionNode
} from "./union.js"

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
	): TypeNode<inferNodeBranches<branches>>
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

export type TypeInput = listable<IntersectionSchema | MorphSchema>

export type TypeNode<t = unknown> = BaseNode<
	BaseAttributes,
	StaticBaseNode<BaseAttributes>,
	t
>

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

export type TypeClassesByKind = {
	union: typeof UnionNode
	morph: typeof MorphNode
	intersection: typeof IntersectionNode
}

export type TypeKind = evaluate<keyof TypeClassesByKind>

export type NodeClassesByKind = extend<
	ConstraintClassesByKind,
	TypeClassesByKind
>

export type NodeKind = keyof NodeClassesByKind

export type NodeClass<kind extends NodeKind = NodeKind> =
	NodeClassesByKind[kind]

export type Schema<kind extends NodeKind> = Parameters<
	NodeClass<kind>["from"]
>[0]

export type unwrap<kind extends NodeKind> = ConstructorParameters<
	NodeClass<kind>
>[0]

export type Node<kind extends NodeKind = NodeKind> = InstanceType<
	NodeClass<kind>
>
