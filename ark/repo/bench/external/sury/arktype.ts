// cases.ts's ArkType arms, which bundle.ts precompiles as the default build
import { type } from "arktype"
import { VALUE } from "./value.ts"

const ARKTYPE = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: { foo: "string", num: "number", bool: "boolean" }
})

export const cases: Record<string, () => unknown> = {
	"parse ArkType": () => ARKTYPE.assert(VALUE),
	"build ArkType": () =>
		type({
			number: "number",
			negNumber: "number",
			maxNumber: "number",
			string: "string",
			longString: "string",
			boolean: "boolean",
			deeplyNested: { foo: "string", num: "number", bool: "boolean" }
		}).assert(VALUE)
}
