import type {
	AttributesRecord,
	UniversalAttributes
} from "./attributes/attribute.js"

export abstract class TypeNode<
	attributes extends AttributesRecord = UniversalAttributes
> {
	constructor(public attributes: attributes) {}

	abstract readonly id: string

	abstract writeDefaultDescription(): string

	equals(other: TypeNode) {
		return this.id === other.id
	}
}
