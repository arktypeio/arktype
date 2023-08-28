import type { Trait } from "@arktype/util"
import { trait } from "@arktype/util"

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
