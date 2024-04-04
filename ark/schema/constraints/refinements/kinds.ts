import {
	type AfterDeclaration,
	type AfterNode,
	afterImplementation
} from "./after.js"
import {
	type BeforeDeclaration,
	type BeforeNode,
	beforeImplementation
} from "./before.js"
import {
	type ExactLengthDeclaration,
	type ExactLengthNode,
	exactLengthImplementation
} from "./exactLength.js"
import { type MaxDeclaration, type MaxNode, maxImplementation } from "./max.js"
import {
	type MaxLengthDeclaration,
	type MaxLengthNode,
	maxLengthImplementation
} from "./maxLength.js"
import { type MinDeclaration, type MinNode, minImplementation } from "./min.js"
import {
	type MinLengthDeclaration,
	type MinLengthNode,
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
