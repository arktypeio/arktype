import {
	wellFormedIntegerMatcher,
	wellFormedNumberMatcher
} from "@arktype/util"
import { type Scope, type rootResolutions } from "../scope.js"
import type { Out } from "../types/morph.js"
import { parsedDate } from "./utils/date.js"

const number = rootSchema({
	in: {
		domain: "string",
		regex: wellFormedNumberMatcher,
		description: "a well-formed numeric string"
	},
	morph: (s: string) => parseFloat(s)
})

const integer = rootSchema({
	in: {
		domain: "string",
		regex: wellFormedIntegerMatcher
	},
	morph: (s: string) => {
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

const url = rootSchema({
	in: {
		domain: "string",
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

const json = rootSchema({
	in: {
		domain: "string",
		description: "a JSON-parsable string"
	},
	morph: (s: string): unknown => JSON.parse(s)
})

const date = parsedDate

export namespace Parsing {
	export interface exports {
		url: (In: string) => Out<URL>
		number: (In: string) => Out<number>
		integer: (In: string) => Out<number>
		date: (In: string) => Out<Date>
		json: (In: string) => Out<unknown>
	}

	export type resolutions = rootResolutions<exports>

	export type infer = (typeof Parsing)["infer"]
}

export const Parsing: Scope<Parsing.resolutions> = {} as never

// 	Scope.root.scope({
// 	url,
// 	number,
// 	integer,
// 	date,
// 	json
// })
