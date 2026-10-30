import { type } from "arktype"
import { After, Before, Epochs, Literal, Stamps } from "./dates.ts"
import { Formatted, Parsed } from "./local.ts"
import { Big, Large, Lengths, Small, Stepped } from "./numbers.ts"

// errors print what a standalone validator keeps of arktype's
const observe = (samples: [type.Any, unknown][]) =>
	samples.map(([T, data]) => {
		const out = T(data)
		return out instanceof type.errors ?
				out.issues.map(issue => [issue.code, ...issue.path])
			:	out
	})

const describe = (types: type.Any[]) =>
	types.map(T => [T.expression, T.description])

// the same wherever it runs
const portable = [
	describe([After, Before, Literal, Epochs, Stamps]),
	describe([Large, Small, Stepped, Big, Lengths]),
	observe([
		[After, new Date("2000-01-01T00:00:00.000Z")],
		[After, new Date(0)],
		[After, new Date(Number.NaN)],
		[Before, new Date("1999-12-31T23:59:59.999Z")],
		[Before, new Date("2000-01-01T00:00:00.000Z")],
		[Literal, new Date(-1)],
		[Literal, new Date("2000-02-28T00:00:00.000Z")],
		[Epochs, new Date(1)],
		[Epochs, new Date(0)],
		[Epochs, new Date(86400001)],
		[
			Stamps,
			{ iso: "2024-02-29T12:00:00.000Z", parsed: "2024-02-29T12:00:00+05:30" }
		],
		[Stamps, { iso: "2024-02-30", epoch: "1700000000000", seconds: 1.5 }],
		[
			Stamps,
			{ iso: "02/29/2024", parsed: "never", epoch: "x", seconds: 8.64e15 + 1 }
		],
		[Large, 1e24],
		[Large, 1234],
		[Small, 5e-7],
		[Small, 0.2],
		[Stepped, 1500000.5],
		[Big, 1.5],
		[Lengths, "x".repeat(1000001)],
		[Lengths, [1, 2]]
	])
]

// read in the local time zone, so the same as arktype's where it runs
const local = observe([
	[Parsed, "1/2/2000"],
	[Parsed, "2000-01-02"],
	[Parsed, "February 30, 2000"],
	[Formatted, "Jan 1 2000 23:30"]
])

console.log(JSON.stringify({ portable, local }))
