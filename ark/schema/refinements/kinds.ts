import type { BaseConstraint } from "../constraint.js"
import type { BoundKind, nodeImplementationOf } from "../shared/implement.js"
import { After } from "./after.js"
import { Before } from "./before.js"
import { ExactLength } from "./exactLength.js"
import { Max } from "./max.js"
import { MaxLength } from "./maxLength.js"
import { Min } from "./min.js"
import { MinLength } from "./minLength.js"

export interface BoundDeclarations {
	min: Min.Declaration
	max: Max.Declaration
	minLength: MinLength.Declaration
	maxLength: MaxLength.Declaration
	exactLength: ExactLength.Declaration
	after: After.Declaration
	before: Before.Declaration
}

export interface BoundNodesByKind {
	min: Min.Node
	max: Max.Node
	minLength: MinLength.Node
	maxLength: MaxLength.Node
	exactLength: ExactLength.Node
	after: After.Node
	before: Before.Node
}

export type boundImplementationsByKind = {
	[k in BoundKind]: nodeImplementationOf<BoundDeclarations[k]>
}

export const boundImplementationsByKind: boundImplementationsByKind = {
	min: Min.implementation,
	max: Max.implementation,
	minLength: MinLength.implementation,
	maxLength: MaxLength.implementation,
	exactLength: ExactLength.implementation,
	after: After.implementation,
	before: Before.implementation
}

export const boundClassesByKind: Record<BoundKind, typeof BaseConstraint<any>> =
	{
		min: Min.Node,
		max: Max.Node,
		minLength: MinLength.Node,
		maxLength: MaxLength.Node,
		exactLength: ExactLength.Node,
		after: After.Node,
		before: Before.Node
	}
