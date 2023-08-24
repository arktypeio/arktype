import { compose } from "@arktype/util"

export interface DescriptionDefinition extends BaseDefinition {
	readonly value: string
}

export class DescriptionNode {
	readonly kind = "description"

	protected reduceRules(other: DescriptionNode) {
		return null
	}
}

export const Describable =
	(abstract: { writeDefaultDescription(): string }) =>
	(input: { description?: string | DescriptionNode }) => ({
		description: input.description ?? abstract.writeDefaultDescription(),
		toString() {
			return this.description
		}
	})

const z = compose(Describable)({
	writeDefaultDescription: () => "foo"
})
