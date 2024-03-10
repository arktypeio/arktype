import { Scope, type rootResolutions } from "../scope.js"
import type { type } from "./ark.js"

export namespace TsKeywords {
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

	export type infer = (typeof TsKeywords)["infer"]
}

export const TsKeywords: Scope<TsKeywords.resolutions> = Scope.root.scope({
	any: "unknown" as type.cast<any>,
	bigint: ["schema", "bigint"],
	boolean: "false|true",
	false: ["===", false],
	never: ["schema", []],
	null: ["===", null],
	number: ["schema", "number"],
	object: ["schema", "object"],
	string: ["schema", "string"],
	symbol: ["schema", "symbol"],
	true: ["===", true],
	unknown: ["schema", {}],
	void: "undefined" as type.cast<void>,
	undefined: ["===", undefined]
})
