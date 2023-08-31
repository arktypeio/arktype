import { Trait } from "@arktype/util"

export class Describable extends Trait<
	{
		writeDefaultDescription(): string
	},
	{ description: string }
> {
	init(rule: unknown, attributes?: { description?: string }) {
		return {
			description: attributes?.description ?? this.writeDefaultDescription()
		}
	}
}
