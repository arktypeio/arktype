import { Trait } from "@arktype/util"

export class Aliasable extends Trait<
	[rule: unknown, attributes?: { alias?: string }]
> {
	protected initialize = () => ({
		// TODO: ensure this is cached
		alias: this.args[1]?.alias ?? "generated"
	})
}
