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
	[unknown, { description?: string }?],
	{ description: string },
	{ writeDefaultDescription: () => string }
>({
	get description() {
		return this.args[1].description ?? this.writeDefaultDescription()
	}
})
