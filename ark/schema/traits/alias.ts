import type { Trait } from "@arktype/util"
import { trait } from "@arktype/util"

export interface Aliasable extends Trait {
	$args: [unknown, { alias?: string }?]
	alias: string
}

export const aliasable = trait<Aliasable>({
	get alias() {
		return this.args[1].alias ?? this.argsd
	}
})
