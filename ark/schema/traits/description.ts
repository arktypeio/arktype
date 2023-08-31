import { Trait } from "@arktype/util"

export class Describable extends Trait<
	[rule: unknown, attributes?: { description?: string }],
	{ description: string },
	{
		writeDefaultDescription(): string
	}
> {
	protected initialize = () => ({
		description: this.args[1]?.description ?? this.writeDefaultDescription()
	})
}
