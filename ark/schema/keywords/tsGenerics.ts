import type { conform, Hkt, Key } from "@ark/util"
import type { SchemaModule } from "../module.js"
import type { Root } from "../roots/root.js"
import { generic, schemaScope, type RootScope } from "../scope.js"

const propKey: Root<Key> = $ark.intrinsic.propertyKey as never

class ArkRecord extends generic(
	["K", propKey],
	"V"
)(args => ({
	domain: "object",
	index: {
		signature: args.K,
		value: args.V
	}
})) {
	declare hkt: (
		args: conform<this[Hkt.args], [PropertyKey, unknown]>
	) => Record<(typeof args)[0], (typeof args)[1]>
}

class ArkPick extends generic("T", ["K", propKey])(args => args.T) {
	declare hkt: (args: conform<this[Hkt.args], [unknown, Key]>) => {
		[k in (typeof args)[1]]: (typeof args)[0][k & keyof (typeof args)[0]]
	} & unknown
}

const tsGenericsExports = {
	Record: ArkRecord,
	Pick: ArkPick
}

export type tsGenericsExports = typeof tsGenericsExports

export type tsGenerics = SchemaModule<tsGenericsExports>

const $: RootScope = schemaScope(tsGenericsExports)

export const tsGenerics: tsGenerics = $.export()
