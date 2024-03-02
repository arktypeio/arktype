import {
	AfterNode,
	BeforeNode,
	type AfterDeclaration,
	type BeforeDeclaration
} from "./date.js"
import {
	ExactLengthNode,
	MaxLengthNode,
	MinLengthNode,
	type ExactLengthDeclaration,
	type MaxLengthDeclaration,
	type MinLengthDeclaration
} from "./length.js"
import {
	MaxNode,
	MinNode,
	type MaxDeclaration,
	type MinDeclaration
} from "./numeric.js"

export interface BoundDeclarations {
	min: MinDeclaration
	max: MaxDeclaration
	minLength: MinLengthDeclaration
	maxLength: MaxLengthDeclaration
	exactLength: ExactLengthDeclaration
	after: AfterDeclaration
	before: BeforeDeclaration
}

export const BoundNodes = {
	min: MinNode,
	max: MaxNode,
	minLength: MinLengthNode,
	maxLength: MaxLengthNode,
	exactLength: ExactLengthNode,
	after: AfterNode,
	before: BeforeNode
}

export type BoundNodesByKind = {
	[k in keyof typeof BoundNodes]: InstanceType<(typeof BoundNodes)[k]>
}
