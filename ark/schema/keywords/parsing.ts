import {
	isWellFormedInteger,
	wellFormedIntegerMatcher,
	wellFormedNumberMatcher
} from "@arktype/util"
import type { TypeNode } from "../base.js"
import { rootSchema, space } from "../space.js"
import type { Out } from "../types/morph.js"
import { parsedDate } from "./utils/date.js"

const number = rootSchema({
	in: {
		domain: "string",
		regex: wellFormedNumberMatcher,
		description: "a well-formed numeric string"
	},
	morphs: (s: string) => parseFloat(s)
})

const integer = rootSchema({
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

const url = rootSchema({
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

const json = rootSchema({
	in: {
		domain: "string",
		description: "a JSON-parsable string"
	},
	morphs: (s: string): unknown => JSON.parse(s)
})

const date = parsedDate

export interface parsing {
	url: TypeNode<(In: string) => Out<URL>, "morph">
	number: TypeNode<(In: string) => Out<number>, "morph">
	integer: TypeNode<(In: string) => Out<number>, "morph">
	date: TypeNode<(In: string) => Out<Date>, "morph">
	json: TypeNode<(In: string) => Out<unknown>, "morph">
}

export const parsing: parsing = space({
	url,
	number,
	integer,
	date,
	json
})
