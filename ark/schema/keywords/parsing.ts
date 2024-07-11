import {
	isWellFormedInteger,
	wellFormedIntegerMatcher,
	wellFormedNumberMatcher
} from "@arktype/util"
import type { number } from "../ast.js"
import type { SchemaModule } from "../module.js"
import type { Out } from "../roots/morph.js"
import { defineRoot, schemaScope } from "../scope.js"
import { tryParseDatePattern } from "./utils/date.js"
import { defineRegex } from "./utils/regex.js"

const number = defineRoot({
	in: defineRegex(wellFormedNumberMatcher, "a well-formed numeric string"),
	morphs: (s: string) => Number.parseFloat(s)
})

const integer = defineRoot({
	in: defineRegex(wellFormedIntegerMatcher, "a well-formed integer string"),
	morphs: (s: string, ctx) => {
		if (!isWellFormedInteger(s))
			return ctx.error("a well-formed integer string")

		const parsed = Number.parseInt(s)
		return Number.isSafeInteger(parsed) ? parsed : (
				ctx.error(
					"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
				)
			)
	}
})

const url = defineRoot({
	in: "string",
	morphs: (s: string, ctx) => {
		try {
			return new URL(s)
		} catch {
			return ctx.error("a valid URL")
		}
	}
})

const json = defineRoot({
	in: "string",
	morphs: (s: string, ctx): object => {
		try {
			return JSON.parse(s)
		} catch {
			return ctx.error("a valid JSON string")
		}
	}
})

const date = defineRoot({
	in: "string",
	morphs: (s: string, ctx) => {
		const result = tryParseDatePattern(s)
		return typeof result === "string" ? ctx.error(result) : result
	}
})

export type parsingExports = {
	url: (In: string) => Out<URL>
	number: (In: string) => Out<number>
	integer: (In: string) => Out<number.divisibleBy<1>>
	date: (In: string) => Out<Date>
	json: (In: string) => Out<object>
}

export type parsing = SchemaModule<parsingExports>

export const parsing: parsing = schemaScope({
	url,
	number,
	integer,
	date,
	json
}).export()
