import { includes, isArray, throwParseError } from "@arktype/util"
import { maybeGetBasisKind } from "./bases/basis.ts"
import type { ConstraintKind } from "./constraints/constraint.ts"
import { BaseNode } from "./node.ts"
import { parseConstraint, parseSchema } from "./parse.ts"
import type { ValidatorKind } from "./sets/morph.ts"
import type {
	BranchKind,
	parseSchemaBranches,
	validateSchemaBranch
} from "./sets/union.ts"
import { builtins } from "./shared/builtins.ts"
import {
	setKinds,
	type NodeKind,
	type Root,
	type RootKind,
	type SetKind
} from "./shared/define.ts"
import { Disjoint } from "./shared/disjoint.ts"
import type { intersectionOf } from "./shared/intersect.ts"
import type { Node, Schema } from "./shared/node.ts"
import { inferred } from "./shared/symbols.ts"

export type NodeParser = {
	<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
		}
	): parseSchemaBranches<branches>
}

const parseRoot: NodeParser = (...branches) =>
	parseSchema("union", branches) as never

type UnitsParser = <const branches extends readonly unknown[]>(
	...values: branches
) => branches["length"] extends 1
	? Node<"unit", branches[0]>
	: Node<"union" | "unit", branches[number]>

const parseUnits: UnitsParser = (...values) => {
	const uniqueValues: unknown[] = []
	for (const value of values) {
		if (!uniqueValues.includes(value)) {
			uniqueValues.push(value)
		}
	}
	const union = uniqueValues.map((unit) =>
		parsePrereduced("unit", { is: unit })
	)
	if (union.length === 1) {
		return union[0]
	}
	return parsePrereduced("union", {
		union
	}) as never
}

export const node = Object.assign(parseRoot, {
	units: parseUnits
})

export function parsePrereduced<kind extends NodeKind>(
	kind: kind,
	schema: Schema<kind>
): Node<kind> {
	return parseSchema(kind, schema, { prereduced: true }) as never
}

export class RootNode<
	kind extends RootKind = RootKind,
	t = unknown
> extends BaseNode<kind, t> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t

	readonly branches: readonly Node<BranchKind>[] =
		this.kind === "union" ? (this as any).union : [this]

	isSet(): this is Node<SetKind> {
		return includes(setKinds, this.kind)
	}

	constrain<constraintKind extends ConstraintKind>(
		kind: constraintKind,
		schema: Schema<constraintKind>
	): Exclude<intersectionOf<this["kind"], constraintKind>, Disjoint> {
		const constrainedBranches = this.branches.map((branch) => {
			const constraint = parseConstraint(
				kind,
				schema as never,
				extractBasis(branch)
			) as any
			return branch.and(constraint)
		})
		return parseSchema("union", { union: constrainedBranches }) as never
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	// TODO: inferIntersection
	and<other extends Node>(
		other: other
	): Exclude<intersectionOf<kind, other["kind"]>, Disjoint> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	// TODO: limit input types
	or<other extends Root>(
		other: other
	): Node<
		"union" | Extract<kind | other["kind"], RootKind>,
		t | other["infer"]
	> {
		return parseSchema("union", [...this.branches, ...other.branches]) as never
	}

	isUnknown(): this is BaseNode<"intersection", unknown> {
		return this.equals(builtins().unknown)
	}

	isNever(): this is BaseNode<"union", never> {
		return this.equals(builtins().never)
	}

	getPath() {
		return this
	}

	array(): Node<"intersection", t[]> {
		return this as never
	}

	extends<other extends Root>(
		other: other
	): this is Node<kind, other["infer"]> {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}

export type reducibleKindOf<kind extends NodeKind> = kind extends "union"
	? RootKind
	: kind extends "intersection"
	  ? ValidatorKind
	  : kind

const extractBasis = (branch: Node<BranchKind>) =>
	branch.kind === "morph"
		? extractValidatorBasis(branch.in)
		: extractValidatorBasis(branch)

const extractValidatorBasis = (validator: Node<ValidatorKind>) =>
	validator.kind === "intersection" ? validator.basis : validator

export const rootKindOfSchema = (schema: unknown): RootKind => {
	const basisKind = maybeGetBasisKind(schema)
	if (basisKind) {
		return basisKind
	}
	if (typeof schema === "object" && schema !== null) {
		if (schema instanceof BaseNode) {
			if (schema.isRoot()) {
				return schema.kind
			}
			// otherwise, error at end of function
		} else if ("morph" in schema) {
			return "morph"
		} else if ("union" in schema || isArray(schema)) {
			return "union"
		} else {
			return "intersection"
		}
	}
	return throwParseError(`${schema} is not a valid root schema type`)
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
