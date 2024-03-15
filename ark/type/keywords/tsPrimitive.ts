import type { Module, Scope, rootResolutions } from "../scope.js"
import type { type } from "./ark.js"
import { root } from "./root.js"

export namespace tsPrimitive {
	export interface exports {
		any: any
		bigint: bigint
		boolean: boolean
		false: false
		never: never
		null: null
		number: number
		object: object
		string: string
		symbol: symbol
		true: true
		unknown: unknown
		void: void
		undefined: undefined
	}

	export type resolutions = rootResolutions<exports>

	export type infer = (typeof tsPrimitive)["infer"]
}

export const tsPrimitive: Scope<tsPrimitive.resolutions> = root.scope(
	{
		any: "unknown" as type.cast<any>,
		bigint: root.schema("bigint"),
		boolean: "false|true",
		false: ["===", false],
		never: root.schema([]),
		null: ["===", null],
		number: root.schema("number"),
		object: root.schema("object"),
		string: root.schema("string"),
		symbol: root.schema("symbol"),
		true: ["===", true],
		unknown: root.schema({}),
		void: "undefined" as type.cast<void>,
		undefined: ["===", undefined]
	},
	{
		prereducedAliases: true,
		registerKeywords: true
	}
)

export const tsPrimitiveKeywords: Module<tsPrimitive.resolutions> =
	tsPrimitive.export()
