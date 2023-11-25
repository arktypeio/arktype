import type { Schema } from "../schema.js"
import { SchemaScope } from "../scope.js"

export interface TsKeywordSchemas {
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

export const tsKeywords: SchemaScope<TsKeywordSchemas> = SchemaScope.from({
	any: {} as Schema<"intersection", any>,
	bigint: "bigint",
	boolean: [{ is: false }, { is: true }],
	false: { is: false },
	never: [],
	null: { is: null },
	number: "number",
	object: "object",
	string: "string",
	symbol: "symbol",
	true: { is: true },
	unknown: {},
	void: { is: undefined } as Schema<"unit", void>,
	undefined: { is: undefined }
})
