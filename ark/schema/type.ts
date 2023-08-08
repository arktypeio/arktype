import type {
	AttributesRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
import type { Disjoint } from "./disjoint.js"

export abstract class TypeNode<
	constraints = unknown,
	attributes extends AttributesRecord = UniversalAttributes
> {
	constructor(
		public constraints: constraints,
		public attributes: attributes
	) {}

	abstract readonly id: string

	abstract intersectConstraints(other: this): constraints | Disjoint

	abstract writeDefaultDescription(): string

	equals(other: TypeNode) {
		return this.id === other.id
	}

	toString() {
		return this.attributes.description ?? this.writeDefaultDescription()
	}
}
