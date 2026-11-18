import { type } from "arktype"

export const Moltar = type({
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
