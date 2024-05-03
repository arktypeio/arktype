import type { BaseConstraint } from "../constraint.js"
import type { BoundKind } from "../shared/implement.js"
import {
	type AfterDeclaration,
	AfterNode,
	afterImplementation
} from "./after.js"
import {
	type BeforeDeclaration,
	BeforeNode,
	beforeImplementation
} from "./before.js"
import {
	type ExactLengthDeclaration,
	ExactLengthNode,
	exactLengthImplementation
} from "./exactLength.js"
import { type MaxDeclaration, MaxNode, maxImplementation } from "./max.js"
import {
	type MaxLengthDeclaration,
	MaxLengthNode,
	maxLengthImplementation
} from "./maxLength.js"
import { type MinDeclaration, MinNode, minImplementation } from "./min.js"
import {
	type MinLengthDeclaration,
	MinLengthNode,
	minLengthImplementation
} from "./minLength.js"

export interface BoundDeclarations {
	min: MinDeclaration
	max: MaxDeclaration
	minLength: MinLengthDeclaration
	maxLength: MaxLengthDeclaration
	exactLength: ExactLengthDeclaration
	after: AfterDeclaration
	before: BeforeDeclaration
}

export interface BoundNodesByKind {
	min: MinNode
	max: MaxNode
	minLength: MinLengthNode
	maxLength: MaxLengthNode
	exactLength: ExactLengthNode
	after: AfterNode
	before: BeforeNode
}

export const boundImplementationsByKind = {
	min: minImplementation,
	max: maxImplementation,
	minLength: minLengthImplementation,
	maxLength: maxLengthImplementation,
	exactLength: exactLengthImplementation,
	after: afterImplementation,
	before: beforeImplementation
}

export const boundClassesByKind: Record<BoundKind, typeof BaseConstraint<any>> =
	{
		min: MinNode,
		max: MaxNode,
		minLength: MinLengthNode,
		maxLength: MaxLengthNode,
		exactLength: ExactLengthNode,
		after: AfterNode,
		before: BeforeNode
	}
