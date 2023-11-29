import type { Schema } from "../schema.js"
import { ScopeNode } from "../scope.js"
import type { schema } from "./keywords.js"

export namespace TsKeywords {
	export interface resolutions {
		any: Schema<any, "intersection">
		bigint: Schema<bigint, "domain">
		boolean: Schema<boolean, "union">
		false: Schema<false, "unit">
		never: Schema<never, "union">
		null: Schema<null, "unit">
		number: Schema<number, "domain">
		object: Schema<object, "domain">
		string: Schema<string, "domain">
		symbol: Schema<symbol, "domain">
		true: Schema<true, "unit">
		unknown: Schema<unknown, "intersection">
		void: Schema<void, "unit">
		undefined: Schema<undefined, "unit">
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
