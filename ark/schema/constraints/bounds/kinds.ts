import { AfterNode, type AfterDeclaration } from "./after.js"
import { BeforeNode, type BeforeDeclaration } from "./before.js"
import { ExactLengthNode, type ExactLengthDeclaration } from "./exactLength.js"
import { MaxNode, type MaxDeclaration } from "./max.js"
import { MaxLengthNode, type MaxLengthDeclaration } from "./maxLength.js"
import { MinNode, type MinDeclaration } from "./min.js"
import { MinLengthNode, type MinLengthDeclaration } from "./minLength.js"

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
