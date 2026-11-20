// a library built on arktype, exporting each shape of Type whose declaration
// `tsc --declaration` writes out. declarations.test.ts emits it.
import { define, fn, generic, match, scope, type } from "arktype"
import { codec } from "arktype/codecs"
import { regex } from "arktype/regex"
import { intersect, parse } from "arktype/sets"

export const User = type({ name: "string", age: "number" })
export const Name = type("string")
export const Age = type("number")
export const Born = type("Date")
export const Tags = type("string[]")
export const Pair = type(["string", "...", "number[]"])
export const Flag = type("boolean")
export const Unknown = type("unknown")
export const Enumerated = type.enumerated("a", 1, true)
export const Instance = type.instanceOf(Map)
export const Or = type("string").or("number")
export const And = type.and({ a: "string" }, { b: "string" })
export const Merged = User.merge({ email: "string.email" })
export const Picked = User.pick("name")
export const Keys = User.keyof()
export const Props = User.props
export const Selected = User.select("required")
export const Users = User.array()
export const Narrowed = type("number").narrow(
	(n, ctx) => n > 0 || ctx.mustBe("positive")
)
export const Branded = type("string").brand("id")

export const Parsed = type("string.numeric.parse")
export const ParsedIn = Parsed.in
export const ParsedOut = Parsed.out
export const Piped = type("string").pipe(s => s.length)
export const PipedTo = type("string").pipe(s => s.length, type("number > 0"))
export const To = type("string").to("number")
export const Json = type("string.json.parse")
export const Form = type("FormData.parse")
export const Defaulted = type({ role: "'admin' | 'member' = 'member'" })
export const DefaultedProps = Defaulted.props
export const WithDefault = type("number").default(0)
export const EpochMs = codec("number.integer", "Date", {
	decode: n => new Date(n),
	encode: d => d.getTime()
})

export const types = scope({ id: "string", user: { id: "id" } })
export const Owned = types.type({ owner: "user" })
export const exported = types.export()
export const nested = scope({
	"#hidden": "string",
	sub: scope({ x: "string" }).export()
}).export()
export const generics = scope({ "box<t>": { box: "t" } }).export()
export const BoxOf = generic("t")({ box: "t" })
export const Box = BoxOf("string")
export const definition = define({ a: "string" })
export const declared = type.declare<{ a: string }>().type({ a: "string" })
export const makeUser = () => type({ made: "string" })

export const matcher = match({
	string: s => s.length,
	number: n => n,
	default: "assert"
})
export const kindMatcher = match
	.in<{ kind: string }>()
	.at("kind")
	.match({ "'a'": o => o, default: "never" })
export const length = fn("string", ":", "number")(s => s.length)
export const join = fn(
	"string",
	"...",
	"number[]",
	":",
	"string"
)((s, ...n) => s + n.join())

export const pattern = regex("^a(b)?$")
export const intersection = intersect(User, Name)
export const fromJsonSchema = parse({ type: "string" })
