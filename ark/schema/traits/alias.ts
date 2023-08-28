import type { TraitDeclaration } from "@arktype/util"
import { trait } from "@arktype/util"

export interface Aliasable extends TraitDeclaration {
	$args: [unknown, { alias?: string }?]
	alias: string
}

export const aliasable = trait<Aliasable>({
	get alias() {
		return this.args[1].alias ?? this.args
	}
})
