import { ScopeNode } from "../scope.js"
import type { Schema } from "../type.js"
import type { schema } from "./ark.js"

export namespace TsKeywords {
	export interface resolutions {
		any: Schema<"intersection", any>
		bigint: Schema<"domain", bigint>
		boolean: Schema<"union", boolean>
		false: Schema<"unit", false>
		never: Schema<"union", never>
		null: Schema<"unit", null>
		number: Schema<"domain", number>
		object: Schema<"domain", object>
		string: Schema<"domain", string>
		symbol: Schema<"domain", symbol>
		true: Schema<"unit", true>
		unknown: Schema<"intersection", unknown>
		void: Schema<"unit", void>
		undefined: Schema<"unit", undefined>
	}

	export type infer = (typeof TsKeywords)["infer"]
}

export const TsKeywords: ScopeNode<TsKeywords.resolutions> = ScopeNode.from({
	any: {} as schema.cast<any, "intersection">,
	bigint: "bigint",
	// since we know this won't be reduced, it can be safely cast to a union
	boolean: [{ unit: false }, { unit: true }] as schema.cast<boolean, "union">,
	false: { unit: false },
	never: [],
	null: { unit: null },
	number: "number",
	object: "object",
	string: "string",
	symbol: "symbol",
	true: { unit: true },
	unknown: {},
	void: { unit: undefined } as schema.cast<void, "unit">,
	undefined: { unit: undefined }
})
