import { bench } from "@ark/attest"
import { match, type } from "arktype"

export const validData = Object.freeze({
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
})

export const t = type({
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

const invokedCases3 = match
	.case("31", n => `${n}` as const)
	.case("32", n => `${n}` as const)
	.case("33", n => `${n}` as const)
	.default("assert")

bench("case(3, invoke)", () => {
	invokedCases3(31)
	invokedCases3(32)
	invokedCases3(33)
}).median([21, "ns"])

// bench("moltar allows", () => {
// 	t.allows(validData)
// }).median([13.19, "ns"])

// bench("moltar apply", () => {
// 	t(validData)
// }).median([22.86, "ns"])

// const stringToLength = type.string.pipe(s => s.length)

// console.log(stringToLength.precompilation)

// $ark.superMorph = (s: string) => s.length

// console.log(stringToLength("foo"))

// bench("shallow primitive morph", () => {
// 	stringToLength("foo")
// }).median([12, "ns"])

// const optimal = (input: unknown) => {
// 	if (typeof input !== "string") throw new Error("ok")
// 	return ($ark.superMorph as any)(input)
// }

// bench("shallow primitive allows", () => {
// 	type.string.allows("foo")
// }).median([7.99, "ns"])

// bench("shallow primitive apply", () => {
// 	type.string("foo")
// }).median([9.89, "ns"])

// bench("optimal primitive morph", () => {
// 	optimal("foo")
// }).median([9.06, "ns"])

// bench("case(3, invoke)", () => {
// 	invokedCases3(31)
// 	invokedCases3(32)
// 	invokedCases3(33)
// }).median([885.33, "ns"])

// const invokedCases10 = match
// 	.case("0n", n => `${n}` as const)
// 	.case("1n", n => `${n}` as const)
// 	.case("2n", n => `${n}` as const)
// 	.case("3n", n => `${n}` as const)
// 	.case("4n", n => `${n}` as const)
// 	.case("5n", n => `${n}` as const)
// 	.case("6n", n => `${n}` as const)
// 	.case("7n", n => `${n}` as const)
// 	.case("8n", n => `${n}` as const)
// 	.case("9n", n => `${n}` as const)
// 	.default("never")

// bench("case(10, invoke first)", () => {
// 	invokedCases10(0n)
// 	invokedCases10(1n)
// 	invokedCases10(2n)
// }).median([983.66, "ns"])

// bench("case(10, invoke last)", () => {
// 	invokedCases10(7n)
// 	invokedCases10(8n)
// 	invokedCases10(9n)
// }).median([1.07, "us"])
