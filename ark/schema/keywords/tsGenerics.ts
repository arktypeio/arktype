import type { conform, Hkt, Key } from "@ark/util"
import { GenericHkt, type GenericRoot } from "../generic.js"
import type { SchemaModule } from "../module.js"
import type { Root } from "../roots/root.js"
import { generic, schemaScope, type RootScope } from "../scope.js"

class RecordHkt extends GenericHkt {
	constructor() {
		super(args => ({
			domain: "object",
			index: {
				signature: args.K,
				value: args.V
			}
		}))
	}

	declare hkt: (
		args: conform<this[Hkt.args], [PropertyKey, unknown]>
	) => Record<(typeof args)[0], (typeof args)[1]>
}

export interface tsGenericsExports<$ = {}> {
	Record: GenericRoot<
		[["K", Key], ["V", unknown]],
		RecordHkt,
		// as long as the generics in the root scope don't reference one
		// another, they shouldn't need a bound local scope
		$
	>
}

export type tsGenerics = SchemaModule<tsGenericsExports>

const $: RootScope = schemaScope({
	Record: generic(
		["K", $ark.intrinsic.propertyKey as {} as Root<Key>],
		"V"
	)(RecordHkt)
})

export const tsGenerics: tsGenerics = $.export()
