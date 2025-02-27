// @ts-nocheck

import { match } from "arktype"
import { P, match as tsPatternMatch } from "ts-pattern"

const toJsonArkType = match({
	"string | number | boolean | null": v => v,
	bigint: b => `${b}n`,
	object: o => {
		for (const k in o) {
			o[k] = toJsonArkType(o[k])
		}
		return o
	},
	default: "assert"
})

toJsonArkType("foo") // 9 nanoseconds
toJsonArkType(5n) // 33 nanoseconds
toJsonArkType({ nestedValue: 5n }) // 44 nanoseconds

const toJsonTsPattern = (value: unknown) =>
	tsPatternMatch(value)
		.with(P.union(P.string, P.number, P.boolean, null), v => v)
		.with(P.bigint, v => `${v}n`)
		.with({}, o => {
			for (const k in o) {
				o[k] = toJsonTsPattern(o[k])
			}
			return o
		})
		.otherwise(() => {
			throw new Error("value is not valid JSON")
		})

toJsonTsPattern("foo") // 765 nanoseconds
toJsonTsPattern(5n) // 924 nanoseconds
toJsonTsPattern({ nestedValue: 5n }) // 2080 nanoseconds
