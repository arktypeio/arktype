import type { Trait } from "@arktype/util"
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

export interface Describable extends Trait {
	$args: [unknown, { description?: string }?]
	description: string
	$writeDefaultDescription(): string
}

export const describable = trait<Describable>({
	get description() {
		return this.args[1].description ?? this.writeDefaultDescription()
	}
})
