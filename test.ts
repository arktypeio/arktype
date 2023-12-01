/* eslint-disable @typescript-eslint/no-restricted-imports */
import { bench } from "@arktype/attest"
import { type } from "arktype"
import { rootSchema, schema, scopeNode } from "./ark/schema/main.js"
import { range } from "./ark/util/main.js"

// bench("string", () => {
// 	const t = type("string|number|boolean|Date")
// }).types([3979, "instantiations"])

// bench("z", () => {
// 	const t = type("string")
// }).types([1866, "instantiations"])

const m = type("string")

bench("number", () => {
	const t = {}
}).types([1142, "instantiations"])

// const aNumber = schema({
// 	basis: "object",
// 	required: { key: "a", value: "number" }
// }).allows

// const aNumberType = type({
// 	a: "number"
// })

// const thousand = range(1000)

// const aNumberData = range(1000).map((i) => ({ a: i }))

// const result = aNumber({ a: 5 }) //?. $

// aNumberType.root.alias //?

// aNumberType.allows({ a: 5 }) //?

// range(1000).forEach((i) => {
// 	aNumberType(aNumberData[i]) //?.
// })

// range(1000).forEach((i) => {
// 	aNumber(aNumberData[i]) //?.
// })

// const baselineANumber = (data: unknown) =>
// 	((typeof data === "object" && data !== null) || typeof data === "function") &&
// 	"a" in data &&
// 	typeof data.a === "number"

// range(1000).forEach((i) => {
// 	baselineANumber(aNumberData[i]) //?.
// })

// const validInput = {
// 	number: 1,
// 	negNumber: -1,
// 	maxNumber: Number.MAX_VALUE,
// 	string: "string",
// 	longString:
// 		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
// 	boolean: true,
// 	deeplyNested: {
// 		foo: "bar",
// 		num: 1,
// 		bool: false
// 	}
// }

// const invalidInput = {
// 	number: 1,
// 	negNumber: -1,
// 	maxNumber: Number.MAX_VALUE,
// 	string: "string",
// 	longString:
// 		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
// 	boolean: true,
// 	deeplyNested: {
// 		foo: "bar",
// 		num: 1,
// 		bool: 5
// 	}
// }

// const dataArray = range(1000).map((i) => ({
// 	...validInput,
// 	number: i
// }))

// const arkType = type({
// 	number: "number",
// 	negNumber: "number",
// 	maxNumber: "number",
// 	string: "string",
// 	longString: "string",
// 	boolean: "boolean",
// 	deeplyNested: {
// 		foo: "string",
// 		num: "number",
// 		bool: "boolean"
// 	}
// })

// const arkSpace = scopeNode({
// 	any: {} as schema.cast<any, "intersection">,
// 	bigint: "bigint",
// 	// since we know this won't be reduced, it can be safely cast to a union
// 	boolean: [{ unit: false }, { unit: true }] as schema.cast<boolean, "union">,
// 	false: { unit: false },
// 	never: [],
// 	null: { unit: null },
// 	number: "number",
// 	object: "object",
// 	string: "string",
// 	symbol: "symbol",
// 	true: { unit: true },
// 	unknown: {},
// 	void: { unit: undefined } as schema.cast<void, "unit">,
// 	undefined: { unit: undefined },
// 	foo: {
// 		basis: "object",
// 		required: [
// 			{ key: "number", value: "number" },
// 			{ key: "negNumber", value: "number" },
// 			{ key: "maxNumber", value: "number" },
// 			{ key: "string", value: "string" },
// 			{ key: "longString", value: "string" },
// 			{ key: "boolean", value: [{ unit: true }, { unit: false }] },
// 			{
// 				key: "deeplyNested",
// 				value: {
// 					basis: "object",
// 					required: [
// 						{ key: "foo", value: "string" },
// 						{ key: "num", value: "number" },
// 						{ key: "bool", value: [{ unit: true }, { unit: false }] }
// 					]
// 				}
// 			}
// 		]
// 	}
// })

// bench("space", () => {
// 	thousand.forEach((i) => {
// 		arkSpace.keywords.foo.allows(dataArray[i])
// 	})
// }).median([164.23, "us"])

// bench("test", () => {
// 	thousand.forEach((i) => {
// 		arkType.allows(dataArray[i])
// 	})
// }).median([164.23, "us"])

// arkType.allows(validInput) //?

// range(1000).forEach((i) => {
// 	arkType.allows(dataArray[i]) //?.
// })

// // range(1000).forEach((i) => {
// // 	arkSpace.keywords.foo.allows(dataArray[i]) //?.
// // })
