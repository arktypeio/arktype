// Sury's ArkType size snippet as a module of its own, for size.ts: the
// precompiler reads files, not esbuild's stdin
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
export const p = (x: unknown) => M.assert(x)
