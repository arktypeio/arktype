import type { TraitDeclaration } from "@arktype/util"
import { trait } from "@arktype/util"

export interface Describable extends TraitDeclaration {
	$args: [unknown, { description?: string }?]
	description: string
	$writeDefaultDescription(): string
}

export const describable = trait<Describable>()({
	get description() {
		return 5
		return this.args[1].description ?? this.writeDefaultDescription()
	}
})
