import {
	isWellFormedInteger,
	wellFormedIntegerMatcher,
	wellFormedNumberMatcher
} from "@arktype/util"
import type { Out } from "../schemas/morph.js"
import { root, space } from "../scope.js"
import { parsedDate } from "./utils/date.js"
import type { spaceFromExports } from "./utils/utils.js"

const number = root.defineSchema({
	in: {
		domain: "string",
		regex: wellFormedNumberMatcher,
		description: "a well-formed numeric string"
	},
	morphs: (s: string) => parseFloat(s)
})

const integer = root.defineSchema({
	in: {
		domain: "string",
		regex: wellFormedIntegerMatcher
	},
	morphs: (s: string, ctx) => {
		if (!isWellFormedInteger(s)) {
			return ctx.error("a well-formed integer string")
		}
		const parsed = parseInt(s)
		return Number.isSafeInteger(parsed)
			? parsed
			: ctx.error(
					"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
			  )
	}
})

const url = root.defineSchema({
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

const json = root.defineSchema({
	in: {
		domain: "string",
		description: "a JSON-parsable string"
	},
	morphs: (s: string): unknown => JSON.parse(s)
})

const date = parsedDate

export namespace parsing {
	export type exports = {
		url: (In: string) => Out<URL>
		number: (In: string) => Out<number>
		integer: (In: string) => Out<number>
		date: (In: string) => Out<Date>
		json: (In: string) => Out<unknown>
	}
}

export type parsing = spaceFromExports<parsing.exports>

export const parsing: parsing = space({
	url,
	number,
	integer,
	date,
	json
})
