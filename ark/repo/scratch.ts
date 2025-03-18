import { bench } from "@ark/attest"
import { type } from "arktype"
import { z } from "zod"

export const validData = Object.freeze({
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
	boolean: true
	// deeplyNested: {
	// 	foo: "bar",
	// 	num: 1,
	// 	bool: false
	// }
})

const t = type({
	"+": "delete",
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean"
})

t.assert(validData)

// bench("ark", () => {
// 	return t.assert(validData)
// }).median([5.57, "us"])

// const zodT = z.object({
// 	number: z.number(),
// 	negNumber: z.number(),
// 	maxNumber: z.number(),
// 	string: z.string(),
// 	longString: z.string(),
// 	boolean: z.boolean()
// })

// bench("zod", () => {
// 	return zodT.parse(validData)
// }).median([584.8, "ns"])

const user = type({
	name: "string",
	isAdmin: "boolean = false",
	"age?": "number"
})

const defaultableProps = user.props.filter(
	p => p.kind === "optional" && "default" in p
)

const nanToNull = type("number.NaN").pipe(() => null, type.null)

const nullNumber = type("number").or(nanToNull)

const out = nullNumber(5) // 5
const out2 = nullNumber(Number.NaN) // null

console.log(nullNumber.out.distribute(branch => branch.expression)) // ["number", "null"]
