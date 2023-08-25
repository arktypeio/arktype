import { trait } from "@arktype/util"

export interface DescriptionDefinition {
	readonly value: string
}

export class DescriptionNode {
	readonly kind = "description"

	protected reduceRules(other: DescriptionNode) {
		return null
	}
}

export const describable = trait<
	{ description?: string },
	{ describe: () => string },
	{ writeDefaultDescription: () => string }
>({
	describe() {
		return this.description ?? this.writeDefaultDescription()
	}
})
