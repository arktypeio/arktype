import { type Entry } from "@ark/util"
import { match } from "arktype"
import { P, match as tsPattern } from "ts-pattern"

const toJsonArkType = match({
	"string | number | boolean | null": v => v,
	bigint: b => `${b}n`,
	object: o =>
		Object.fromEntries(
			Object.entries(o).map(([k, v]): Entry => [k, toJsonArkType(v)])
		),
	default: "assert"
})

const toJsonTsPattern = (value: unknown) =>
	tsPattern(value)
		.with(P.union(P.string, P.number, P.boolean, null), v => v)
		.with(P.bigint, v => `${v}n`)
		.with({}, o =>
			Object.fromEntries(
				Object.entries(o).map(([k, v]): Entry => [k, toJsonTsPattern(v)])
			)
		)
		.otherwise(() => {
			throw new Error("value is not valid JSON")
		})

// "foo" (9 nanoseconds)
toJsonArkType("foo")
// "foo" (765 nanoseconds)
toJsonTsPattern("foo")

// "5n" (33 nanoseconds)
toJsonArkType(5n)
// "5n" (924 nanoseconds)
toJsonTsPattern(5n)

// { nestedValue: "5n" } (317 nanoseconds)
toJsonArkType({ nestedValue: 5n })
// { nestedValue: "5n" } (2862 nanoseconds)
toJsonTsPattern({ nestedValue: 5n })
