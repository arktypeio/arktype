import { bench } from "@ark/attest"
import { match } from "arktype"

// inputs are exported so V8 can't fold a bench's work into a constant

const invokedCases3 = match
	.case("31", n => `${n}` as const)
	.case("32", n => `${n}` as const)
	.case("33", n => `${n}` as const)
	.default("assert")

export const cases3Data = [31, 32, 33] as const

bench("case(3, invoke)", () => cases3Data.map(n => invokedCases3(n))).median([
	23.28,
	"ns"
])

const invokedCases10 = match
	.case("0n", n => `${n}` as const)
	.case("1n", n => `${n}` as const)
	.case("2n", n => `${n}` as const)
	.case("3n", n => `${n}` as const)
	.case("4n", n => `${n}` as const)
	.case("5n", n => `${n}` as const)
	.case("6n", n => `${n}` as const)
	.case("7n", n => `${n}` as const)
	.case("8n", n => `${n}` as const)
	.case("9n", n => `${n}` as const)
	.default("never")

export const cases10FirstData = [0n, 1n, 2n] as const

bench("case(10, invoke first)", () =>
	cases10FirstData.map(n => invokedCases10(n))
).median([118.12, "ns"])

export const cases10LastData = [7n, 8n, 9n] as const

bench("case(10, invoke last)", () =>
	cases10LastData.map(n => invokedCases10(n))
).median([173.02, "ns"])

type Data =
	| {
			id: 1
			oneValue: number
	  }
	| {
			id: 2
			twoValue: string
	  }

const discriminateValue = match
	.in<Data>()
	.at("id")
	.match({
		1: o => `${o.oneValue}!`,
		2: o => o.twoValue.length,
		default: "assert"
	})

export const discriminateData: Data[] = [
	{ id: 1, oneValue: 1 },
	{ id: 2, twoValue: "two" }
]

bench("discriminate", () =>
	discriminateData.map(o => discriminateValue(o))
).median([48.97, "ns"])
