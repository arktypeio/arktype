import { bench } from "@ark/attest"
import { match, type } from "arktype"

export const validData = {
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
	boolean: true,
	deeplyNested: {
		foo: "bar",
		num: 1,
		bool: false
	}
}

const TReject = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: {
		foo: "string",
		num: "number",
		bool: "boolean"
	}
}).onDeepUndeclaredKey("reject")

bench("moltar reject", () => TReject(validData)).median()

export const T = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: {
		foo: "string",
		num: "number",
		bool: "boolean"
	}
})

bench("moltar allows", () => T.allows(validData)).median()

bench("moltar apply", () => T(validData)).median()

const tDelete = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: {
		foo: "string",
		num: "number",
		bool: "boolean"
	}
}).onDeepUndeclaredKey("delete")

bench("moltar delete", () => tDelete(validData)).median()

const tShallowDelete = type({
	"+": "delete",
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean"
})

bench("shallow delete", () => tShallowDelete(validData)).median()

export const primitiveData = "foo"

bench("shallow primitive allows", () =>
	type.string.allows(primitiveData)
).median()

bench("shallow primitive apply", () => type.string(primitiveData)).median()

const stringToLength = type.string.pipe(s => s.length)

bench("shallow primitive morph", () => stringToLength(primitiveData)).median()

const invokedCases3 = match
	.case("31", n => `${n}` as const)
	.case("32", n => `${n}` as const)
	.case("33", n => `${n}` as const)
	.default("assert")

bench("case(3, invoke)", () => {
	invokedCases3(31)
	invokedCases3(32)
	return invokedCases3(33)
}).median()

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
	return invokedCases10(2n)
}).median()

bench("case(10, invoke last)", () => {
	invokedCases10(7n)
	invokedCases10(8n)
	return invokedCases10(9n)
}).median()

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

bench("discriminate", () => {
	discriminateValue({ id: 1, oneValue: 1 })
	return discriminateValue({ id: 2, twoValue: "two" })
}).median()
