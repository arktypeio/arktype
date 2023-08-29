import { Trait } from "@arktype/util"

export class Describable extends Trait<{
	writeDefaultDescription: () => string
}> {
	declare args: [unknown, { description?: string }?]

	get description() {
		return this.args[1]?.description ?? this.writeDefaultDescription()
	}
}
