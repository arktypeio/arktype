import { schema, type Out } from "@arktype/schema"
import {
	wellFormedIntegerMatcher,
	wellFormedNumberMatcher
} from "@arktype/util"
import { Scope } from "../scope.js"
import type { RootScope } from "./ark.js"
import { parsedDate } from "./utils/date.js"

const number = schema({
	in: {
		basis: "string",
		pattern: wellFormedNumberMatcher,
		description: "a well-formed numeric string"
	},
	morph: (s: string) => parseFloat(s)
})

const integer = schema({
	in: {
		basis: "string",
		pattern: wellFormedIntegerMatcher
	},
	morph: (s: string) => {
		// if (!isWellFormedInteger(s)) {
		// 	return problems.mustBe("a well-formed integer string")
		// }
		// const parsed = parseInt(s)
		// return Number.isSafeInteger(parsed)
		// 	? parsed
		// 	: problems.mustBe(
		// 			"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
		// 	  )
		return parseInt(s)
	}
})

const url = schema({
	in: {
		basis: "string",
		description: "a valid URL"
	},
	morph: (s: string) => {
		return new URL(s)
		// try {
		// 	return new URL(s)
		// } catch {
		// 	return state.mustBe("a valid URL", s, state.basePath)
		// }
	}
})

const json = schema({
	in: {
		basis: "string",
		description: "a JSON-parsable string"
	},
	morph: (s: string): unknown => JSON.parse(s)
})

const date = parsedDate

export interface InferredParsing {
	url: (In: string) => Out<URL>
	number: (In: string) => Out<number>
	integer: (In: string) => Out<number>
	date: (In: string) => Out<Date>
	json: (In: string) => Out<unknown>
}

export const parsing: RootScope<InferredParsing> = Scope.root({
	url,
	number,
	integer,
	date,
	json
})

export const parsingModule = parsing.export()

export type ParsingModule = typeof parsingModule
