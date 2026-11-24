// @ts-nocheck
// String definitions covering ArkType's expression syntax.
import { type } from "arktype"

type({
	keywords: "string | number | bigint | boolean | symbol | object",
	units: "true | false | null | undefined | unknown | never | any | void",
	subtypes: "string.email | string.uuid.v4 | number.integer | string.json.parse",
	morphs: "string.trim |> string.lower",
	arrays: "string[] | (string | number)[][]",
	tuplesInString: "[string, number?]",
	literals: "'foo' | 'bar' | \"baz\" | 5 | -1.5 | 1e10 | 0x1f | 5n",
	bounds: "5 < number <= 10",
	lengths: "string >= 1",
	exclusive: "0 < string.length < 255",
	dates: "Date < d'2025-01-01'",
	divisors: "number % 2",
	defaults: "number = 5",
	optionalDefault: "string = 'anonymous'",
	intersection: "string & /@arktype\\.io$/",
	regexLiteral: "/^[a-z]+(-[a-z]+)*$/i",
	regexWithQuotes: "/^'[a-z]'$/",
	regexWordChars: "/^[a-z_]+é$/",
	generics: "Record<string, number> | Array<string> | Partial<User>",
	nestedGenerics: "Map<string, Set<number>>",
	keyof: "keyof User",
	typeofLike: "typeof x",
	arrowMorph: "string => number",
	scoped: "user.profile.name | $ark.string",
	alias: "User | Admin[]",
	identifiers: "_private | $dollar | camelCase | snake_case | PascalCase2",
	spaces: "   string   ",
	empty: "",
	symbols: "!@#^*-+~?",
	"optional?": "string",
	"[string]": "unknown",
	"+": "reject",
	"...": "Base",
	"quoted key with | operator": "string"
})

const single = type('string | number')
const template = type(`string[] | ${"number"}`)
