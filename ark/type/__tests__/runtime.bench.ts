import { bench } from "@ark/attest"
import { match, type } from "arktype"

const stringToLength = type.string.pipe(s => s.length)

bench("shallow primitive morph", () => {
	stringToLength("foo")
}).median([250.36, "ns"])

const invokedCases3 = match
	.case("31", n => `${n}` as const)
	.case("32", n => `${n}` as const)
	.case("33", n => `${n}` as const)
	.default("assert")

bench("case(3, invoke)", () => {
	invokedCases3(31)
	invokedCases3(32)
	invokedCases3(33)
}).median([885.33, "ns"])

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

bench("case(10, invoke first)", () => {
	invokedCases10(0n)
	invokedCases10(1n)
	invokedCases10(2n)
}).median([983.66, "ns"])

bench("case(10, invoke last)", () => {
	invokedCases10(7n)
	invokedCases10(8n)
	invokedCases10(9n)
}).median([1.07, "us"])
