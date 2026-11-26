import { bench } from "@ark/attest"
import { match, type } from "arktype"

bench.baseline(() => {
	// resolve the keywords the benches use, as any program's first Type would
	type("never | string | number | boolean | symbol | object")
	match.case("never", () => {}).default("assert")
	match({
		never: () => {},
		default: "assert"
	})
})

bench("case(3, define)", () =>
	match
		.case("-1", n => `${n}` as const)
		.case("-2", n => `${n}` as const)
		.case("-3", n => `${n}` as const)
		.default("assert")
).types([1497, "instantiations"])

bench("case(10, define)", () =>
	match
		.case("0", n => `${n}` as const)
		.case("1", n => `${n}` as const)
		.case("2", n => `${n}` as const)
		.case("3", n => `${n}` as const)
		.case("4", n => `${n}` as const)
		.case("5", n => `${n}` as const)
		.case("6", n => `${n}` as const)
		.case("7", n => `${n}` as const)
		.case("8", n => `${n}` as const)
		.case("9", n => `${n}` as const)
		.default("assert")
).types([5585, "instantiations"])

bench("match.in<t> cases define and invoke", () => {
	const matcher = match
		.in<string | number | boolean>()
		.case("string", s => s)
		.case("number", n => n)
		.case("boolean", b => b)
		.default("assert")

	const zero = matcher("abc")
	const one = matcher(4)
	const two = matcher(true)
	return [zero, one, two]
}).types([2736, "instantiations"])

bench("record(3, define)", () =>
	match({
		"20": n => `${n}` as const,
		"21": n => `${n}` as const,
		"22": n => `${n}` as const,
		default: "assert"
	})
).types([2001, "instantiations"])

bench("record(10, define)", () =>
	match({
		"-10n": n => `${n}` as const,
		"-1n": n => `${n}` as const,
		"-2n": n => `${n}` as const,
		"-3n": n => `${n}` as const,
		"-4n": n => `${n}` as const,
		"-5n": n => `${n}` as const,
		"-6n": n => `${n}` as const,
		"-7n": n => `${n}` as const,
		"-8n": n => `${n}` as const,
		"-9n": n => `${n}` as const,
		default: "assert"
	})
).types([5284, "instantiations"])

bench("record.in<t> define and invoke", () => {
	const matcher = match.in<string | number | boolean>().match({
		symbol: s => s,
		object: n => n,
		boolean: b => b,
		default: "assert"
	})

	const zero = matcher("abc")
	const one = matcher(4)
	const two = matcher(true)
	return [zero, one, two]
}).types([2684, "instantiations"])

type Discriminated10 =
	| { kind: "a0"; a0: string }
	| { kind: "a1"; a1: string }
	| { kind: "a2"; a2: string }
	| { kind: "a3"; a3: string }
	| { kind: "a4"; a4: string }
	| { kind: "a5"; a5: string }
	| { kind: "a6"; a6: string }
	| { kind: "a7"; a7: string }
	| { kind: "a8"; a8: string }
	| { kind: "a9"; a9: string }

bench("in<t>.at(10, define)", () =>
	match
		.in<Discriminated10>()
		.at("kind")
		.match({
			"'a0'": o => o.a0,
			"'a1'": o => o.a1,
			"'a2'": o => o.a2,
			"'a3'": o => o.a3,
			"'a4'": o => o.a4,
			"'a5'": o => o.a5,
			"'a6'": o => o.a6,
			"'a7'": o => o.a7,
			"'a8'": o => o.a8,
			"'a9'": o => o.a9,
			default: "assert"
		})
).types([7292, "instantiations"])

const invokedCases3 = match
	.case("31", n => `${n}` as const)
	.case("32", n => `${n}` as const)
	.case("33", n => `${n}` as const)
	.default("assert")

bench("case(3, invoke)", () => {
	invokedCases3(31)
	invokedCases3(32)
	invokedCases3(33)
}).types([443, "instantiations"])

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

bench("case(10, invoke first)", () => {
	invokedCases10(0n)
	invokedCases10(1n)
	invokedCases10(2n)
}).types([1044, "instantiations"])

bench("case(10, invoke last)", () => {
	invokedCases10(7n)
	invokedCases10(8n)
	invokedCases10(9n)
}).types([1043, "instantiations"])
