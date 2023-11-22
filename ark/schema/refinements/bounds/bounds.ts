import type { AfterDeclaration, BeforeDeclaration } from "./date.js"
import {
	MaxLengthImplementation,
	MinLengthImplementation,
	type MaxLengthDeclaration,
	type MinLengthDeclaration
} from "./length.js"
import {
	MaxImplementation,
	MinImplementation,
	type MaxDeclaration,
	type MinDeclaration
} from "./numeric.js"

export type BoundDeclarations = {
	min: MinDeclaration
	max: MaxDeclaration
	minLength: MinLengthDeclaration
	maxLength: MaxLengthDeclaration
	after: AfterDeclaration
	before: BeforeDeclaration
}

export const BoundImplementations = {
	min: MinImplementation,
	max: MaxImplementation,
	minLength: MinLengthImplementation,
	maxLength: MaxLengthImplementation
}
