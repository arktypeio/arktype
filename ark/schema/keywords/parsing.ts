import {
	isWellFormedInteger,
	wellFormedIntegerMatcher,
	wellFormedNumberMatcher
} from "@arktype/util"
import type { SchemaModule } from "../module.js"
import type { Out } from "../roots/morph.js"
import { root, schemaScope } from "../scope.js"
import { tryParseDatePattern } from "./utils/date.js"

const number = root.defineRoot({
	in: {
		domain: "string",
		regex: wellFormedNumberMatcher,
		description: "a well-formed numeric string"
	},
	morphs: (s: string) => Number.parseFloat(s)
})

const integer = root.defineRoot({
	in: {
		domain: "string",
		regex: wellFormedIntegerMatcher
	},
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

const url = root.defineRoot({
	in: {
		domain: "string",
		description: "a valid URL"
	},
	morphs: (s: string, ctx) => {
		try {
			return new URL(s)
		} catch {
			return ctx.error("a valid URL")
		}
	}
})

const json = root.defineRoot({
	in: {
		domain: "string",
		description: "a JSON-parsable string"
	},
	morphs: (s: string): unknown => JSON.parse(s)
})

const date = root.defineRoot({
	in: "string",
	morphs: (s: string, ctx) => {
		const result = tryParseDatePattern(s)
		return typeof result === "string" ? ctx.error(result) : result
	}
})

export type parsingExports = {
	url: (In: string) => Out<URL>
	number: (In: string) => Out<number>
	integer: (In: string) => Out<number>
	date: (In: string) => Out<Date>
	json: (In: string) => Out<unknown>
}

export type parsing = SchemaModule<parsingExports>

export const parsing: parsing = schemaScope({
	url,
	number,
	integer,
	date,
	json
}).export()
