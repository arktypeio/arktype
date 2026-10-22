import { scope, type, type BaseType } from "arktype"

export class Account {
	declare id: string
}

class Session {
	declare token: string
}

export const Parsed = type("string.numeric.parse")

export const Length = type("string").pipe(s => s.length)

export const Branded = type("string").brand("id")

export const Prefixed = type("string").narrow((s): s is `a${string}` =>
	s.startsWith("a")
)

export const Pair = type(["string", "number?"])

export const Rest = type(["string", "...", "number[]"])

export const Frozen = type({
	at: "Date",
	"key-with-dash": "boolean | null"
}).readonly()

export const Owned = type({ account: type.instanceOf(Account), length: Length })

export const Held = type({ session: type.instanceOf(Session) })

export const ParsedJson = type("string.json.parse")

export const Sessions = scope({
	node: { session: ["instanceof", Session], "next?": "node" }
}).type({ head: "node" })

export type Expanding<t> = { next: Expanding<[t]> }

export const Expanded = type("object").as<Expanding<string>>()

export const Annotated: BaseType<{ a: string }> = type({ a: "string" })
