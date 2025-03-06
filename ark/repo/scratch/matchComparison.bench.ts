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

bench("case(3, invoke)", () => {
	arkMatch3(31)
	arkMatch3(32)
	arkMatch3(33)
}).mean([832.71, "ns"])

bench("ts-pattern case(3, invoke)", () => {
	tsPatternMatch3(31)
	tsPatternMatch3(32)
	tsPatternMatch3(33)
}).mean([384.92, "ns"])

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

bench("case(10, invoke first)", () => {
	arkMatch10(0n)
	arkMatch10(1n)
	arkMatch10(2n)
}).mean([892.59, "ns"])

bench("ts-pattern case(10, invoke first)", () => {
	tsPatternMatch10(0n)
	tsPatternMatch10(1n)
	tsPatternMatch10(2n)
}).mean([796.69, "ns"])

bench("case(10, invoke last)", () => {
	arkMatch10(7n)
	arkMatch10(8n)
	arkMatch10(9n)
}).mean([977.74, "ns"])

bench("ts-pattern case(10, invoke last)", () => {
	tsPatternMatch10(7n)
	tsPatternMatch10(8n)
	tsPatternMatch10(9n)
}).mean([1.63, "us"])
