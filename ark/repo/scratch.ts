import { match } from "arktype"

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
	.default("assert")

console.log(invokedCases10.internal.precompilation)
