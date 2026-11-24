// Random diagnostic messages built from the pieces ErrorLens's replace rules
// key on (and the characters JS regex semantics single out), each with the
// output V8 gives for them, so the Lua port is checked well past the fixtures.
import {
	rewrite,
	type ReplaceRule
} from "@ark/editor-conformance/diagnostics/errorLens.ts"

export type FuzzCase = {
	input: string
	output: string
	rule: number | null
}

const pieces = [
	"'ErrorType<",
	"'errortype<",
	"ErrorType",
	'"',
	"'",
	">'",
	"\">'",
	'brand": "ErrorType"; ',
	'BRAND": "errortype"; ',
	" }'.",
	" \\}'.",
	"'.",
	"\"'.",
	"\u200A",
	"\u200B",
	"Type '\"",
	"type '\"",
	"Argument of type '\"",
	"ARGUMENT OF TYPE '\"",
	"\"' is not assignable to type '\"",
	"\"' is not assignable to parameter of type '\"",
	"\"' IS NOT ASSIGNABLE TO PARAMETER OF TYPE '\"",
	"string",
	"STRING",
	"\u017Ftring",
	"\u212Aey",
	"key",
	"number",
	" | ",
	".",
	"\n",
	"\n  ",
	"\r\n",
	"\r",
	"\t",
	"\u2028",
	"\u2029",
	"$",
	"$$",
	"$&",
	"$`",
	"$'",
	"$1",
	"$2",
	"$0",
	"$10",
	"$<x>",
	"\u{1F6A2}",
	"é",
	"\u0390",
	"\u1FD3",
	"<",
	">",
	"{ ",
	" }",
	";",
	"x",
	" "
]

const mulberry32 = (seed: number) => () => {
	seed |= 0
	seed = (seed + 0x6d2b79f5) | 0
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const templates = [
	(s: string) => `Type '"${s}"' is not assignable to type 'ErrorType<"${s}">'.`,
	(s: string) =>
		`Argument of type '"${s}"' is not assignable to parameter of type '"${s}${s}" | "x"'.`,
	(s: string) => `Type '"${s}"' is not assignable to type '"${s}"'.`,
	(s: string) =>
		`Type '{ a: 1; }' is not assignable to type '{ " brand": "ErrorType"; ${s} }'.`,
	(s: string) =>
		`Argument of type '"${s}"' is not assignable to parameter of type '"${s}\u200A"'.`,
	(s: string) => `Outer\n  ${s}\n    Inner '${s}'.`,
	(s: string) => s
]

export const fuzzCases = (
	rules: ReplaceRule[],
	count: number,
	seed = 1
): FuzzCase[] => {
	const random = mulberry32(seed)
	const pick = <t>(list: readonly t[]) =>
		list[Math.floor(random() * list.length)]
	const cases: FuzzCase[] = []
	for (let i = 0; i < count; i++) {
		const length = 1 + Math.floor(random() * 12)
		let s = ""
		for (let j = 0; j < length; j++) s += pick(pieces)
		const input = pick(templates)(s)
		const { message, rule } = rewrite(input, rules)
		cases.push({ input, output: message, rule })
	}
	return cases
}
