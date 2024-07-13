import type { GenericRoot } from "../generic.js"
import type { SchemaModule } from "../module.js"
import { generic, schemaScope, type RootScope } from "../scope.js"

export interface tsGenericsExports<$ = {}> {
	Record: GenericRoot<
		[["K", PropertyKey], ["V", unknown]],
		{
			"[K]": "V"
		},
		// as long as the generics in the root scope don't reference one
		// another, they shouldn't need a bound local scope
		$
	>
}

export type tsGenerics = SchemaModule<tsGenericsExports>

const $: RootScope = schemaScope({
	Record: generic(["K", "V"], args => ({
		domain: "object",
		index: {
			signature: args.K,
			value: args.V
		}
	}))
})

export const tsGenerics: tsGenerics = $.export()
