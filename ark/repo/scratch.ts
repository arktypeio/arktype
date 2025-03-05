import { type } from "arktype"

export const urDOOMed = type({
	grouping: "(0 | (1 | (2 | (3 | (4 | 5)[])[])[])[])[]",
	nestedGenerics: "Exclude<0n | unknown[] | Record<string, unknown>, object>",
	"escapes\\?": "'a | b' | 'c | d'"
})
