import { Trait } from "@arktype/util"

export class Aliasable extends Trait<{
	writeDefaultDescription: () => string
}> {
	declare args: [unknown, { alias?: string }?]

	get alias() {
		// ensure this is cached
		return this.args[1]?.alias ?? "generated"
	}
}
