import type { Out } from "@arktype/schema"
import {
	wellFormedIntegerMatcher,
	wellFormedNumberMatcher
} from "@arktype/util"
import type { Module, Scope, rootResolutions } from "../scope.js"
import { root } from "./root.js"
import { parsedDate } from "./utils/date.js"

const number = root.schema({
	in: {
		domain: "string",
		regex: wellFormedNumberMatcher,
		description: "a well-formed numeric string"
	},
	morphs: (s: string) => parseFloat(s)
})

const integer = root.schema({
	in: {
		domain: "string",
		regex: wellFormedIntegerMatcher
	},
	morphs: (s: string) => {
		// if (!isWellFormedInteger(s)) {
		// 	return errors.mustBe("a well-formed integer string")
		// }
		// const parsed = parseInt(s)
		// return Number.isSafeInteger(parsed)
		// 	? parsed
		// 	: errors.mustBe(
		// 			"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
		// 	  )
		return parseInt(s)
	}
})

const url = root.schema({
	in: {
		domain: "string",
		description: "a valid URL"
	},
	morphs: (s: string) => {
		return new URL(s)
		// try {
		// 	return new URL(s)
		// } catch {
		// 	return state.mustBe("a valid URL", s, state.basePath)
		// }
	}
})

const json = root.schema({
	in: {
		domain: "string",
		description: "a JSON-parsable string"
	},
	morphs: (s: string): unknown => JSON.parse(s)
})

const date = parsedDate

export namespace parsing {
	export interface exports {
		url: (In: string) => Out<URL>
		number: (In: string) => Out<number>
		integer: (In: string) => Out<number>
		date: (In: string) => Out<Date>
		json: (In: string) => Out<unknown>
	}

	export type resolutions = rootResolutions<exports>

	export type infer = (typeof parsing)["infer"]
}

export const parsing: Scope<parsing.resolutions> = {} as never

export const parsingKeywords: Module<parsing.resolutions> = {} as never

// 	Scope.root.scope({
// 	url,
// 	number,
// 	integer,
// 	date,
// 	json
// })
