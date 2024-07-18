import type { conform, Hkt, Key } from "@ark/util"
import {
	GenericHkt,
	type GenericHktSubclass,
	type GenericRoot
} from "../generic.js"
import type { SchemaModule } from "../module.js"
import type { Root } from "../roots/root.js"
import { generic, schemaScope, type RootScope } from "../scope.js"

class RecordHkt extends GenericHkt<[["K", Key], ["V", unknown]]> {
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

class PickHkt extends GenericHkt<[["T", unknown], ["K", Key]]> {
	constructor() {
		super(args => args.T)
	}

	declare hkt: (args: conform<this[Hkt.args], [unknown, Key]>) => {
		[k in (typeof args)[1]]: (typeof args)[0][k & keyof (typeof args)[0]]
	} & unknown
}

const hktsByName = {
	Record: RecordHkt,
	Pick: PickHkt
} as const satisfies Record<string, GenericHktSubclass>

type hktsByName = typeof hktsByName

type GenericName = keyof hktsByName

// as long as the generics in the root scope don't reference one
// another, they shouldn't need a bound local scope
type hktToRoot<hkt extends GenericHktSubclass, $> =
	hkt extends GenericHktSubclass<infer params> ?
		GenericRoot<params, InstanceType<hkt>, $>
	:	never

export type tsGenericsExports<$ = {}> = {
	[k in GenericName]: hktToRoot<hktsByName[k], $>
}

const propKey: Root<Key> = $ark.intrinsic.propertyKey as never

const tsGenericsExports: tsGenericsExports<{}> = {
	Record: generic(["K", propKey], "V")(RecordHkt),
	Pick: generic("T", ["K", propKey])(PickHkt)
}

export type tsGenerics = SchemaModule<tsGenericsExports>

const $: RootScope = schemaScope(tsGenericsExports)

export const tsGenerics: tsGenerics = $.export()
