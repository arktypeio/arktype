import { bench } from "@ark/attest"
import { match } from "arktype"
import { match as tsPatternMatch } from "ts-pattern"

const arkMatch3 = match
	.case("31", n => `${n}` as const)
	.case("32", n => `${n}` as const)
	.case("33", n => `${n}` as const)
	.default("assert")

const tsPatternMatch3 = (n: 31 | 32 | 33) =>
	tsPatternMatch(n)
		.with(31, n => `${n}`)
		.with(32, n => `${n}`)
		.with(33, n => `${n}`)
		.exhaustive()

// inputs are exported so V8 can't fold a bench's work into a constant
export const cases3Data = [31, 32, 33] as const

bench("case(3, invoke)", () => cases3Data.map(n => arkMatch3(n))).mean([
	832.71,
	"ns"
])

bench("ts-pattern case(3, invoke)", () =>
	cases3Data.map(n => tsPatternMatch3(n))
).mean([384.92, "ns"])

const arkMatch10 = match
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

const tsPatternMatch10 = (n: typeof arkMatch10.inferIn) =>
	tsPatternMatch(n)
		.with(0n, n => `${n}`)
		.with(1n, n => `${n}`)
		.with(2n, n => `${n}`)
		.with(3n, n => `${n}`)
		.with(4n, n => `${n}`)
		.with(5n, n => `${n}`)
		.with(6n, n => `${n}`)
		.with(7n, n => `${n}`)
		.with(8n, n => `${n}`)
		.with(9n, n => `${n}`)
		.exhaustive()

export const cases10FirstData = [0n, 1n, 2n] as const

bench("case(10, invoke first)", () =>
	cases10FirstData.map(n => arkMatch10(n))
).mean([892.59, "ns"])

bench("ts-pattern case(10, invoke first)", () =>
	cases10FirstData.map(n => tsPatternMatch10(n))
).mean([796.69, "ns"])

export const cases10LastData = [7n, 8n, 9n] as const

bench("case(10, invoke last)", () =>
	cases10LastData.map(n => arkMatch10(n))
).mean([977.74, "ns"])

bench("ts-pattern case(10, invoke last)", () =>
	cases10LastData.map(n => tsPatternMatch10(n))
).mean([1.63, "us"])
