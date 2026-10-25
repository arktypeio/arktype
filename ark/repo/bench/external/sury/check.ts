// Sury's ArkType size snippet as a boolean check, for size.ts's check arms
import { type } from "arktype"
const M = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: { foo: "string", num: "number", bool: "boolean" }
})
export const p = (x: unknown) => M.allows(x)
