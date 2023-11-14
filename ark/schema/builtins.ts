import { cached } from "@arktype/util"
import { node } from "./base.ts"

export const builtins = cached(() => ({
	// never: node(),
	// unknown: node({}),
	// object: node("object"),
	// number: node("number"),
	// nonVariadicArrayIndex: node("number"),
	// arrayIndexTypeNode: node("number"),
	// string: node("string"),
	// array: node(Array),
	// date: node(Date),
	// unknownUnion: node(
	// 	"string",
	// 	"number",
	// 	"object",
	// 	"bigint",
	// 	"symbol",
	// 	{ unit: true },
	// 	{ unit: false },
	// 	{ unit: null },
	// 	{ unit: undefined }
	// )
}))
