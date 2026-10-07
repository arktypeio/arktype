// typechecked against the built packages with each supported TypeScript
// version in CI to ensure inference holds outside the version we test with
import { regex } from "arkregex"
import { match, scope, type } from "arktype"

type equals<l, r> =
	(<t>() => t extends l ? 1 : 0) extends <t>() => t extends r ? 1 : 0 ? true
	:	false

const assertEquals = <l, r>(
	..._: equals<l, r> extends true ? [] : [never]
) => {}

export const User = type({
	name: "string",
	age: "number.integer >= 0",
	"email?": "string.email",
	tags: "string[]",
	role: "'admin' | 'user' = 'user'"
})

assertEquals<
	typeof User.infer,
	{
		name: string
		age: number
		email?: string
		tags: string[]
		role: "admin" | "user"
	}
>()

assertEquals<
	typeof User.inferIn,
	{
		name: string
		age: number
		email?: string
		tags: string[]
		role?: "admin" | "user"
	}
>()

export const Parsed = type("string.numeric.parse").pipe(n => `${n}` as const)

assertEquals<typeof Parsed.inferIn, string>()
assertEquals<typeof Parsed.infer, `${number}`>()

export const Tuple = type(["string", "number?", "...", "boolean[]"])

assertEquals<typeof Tuple.infer, [string, number?, ...boolean[]]>()

export const Union = type({ kind: "'a'", a: "number" }).or({
	kind: "'b'",
	b: "string"
})

assertEquals<
	typeof Union.infer,
	{ kind: "a"; a: number } | { kind: "b"; b: string }
>()

const boxOf = type("<t>", { box: "t" })
export const StringBox = boxOf("string")

assertEquals<typeof StringBox.infer, { box: string }>()

const $ = scope({
	Node: { value: "number", "next?": "Node" },
	List: { head: "Node" }
})
// not exported, since TS 7.1 rejects declaration emit for anonymous cyclic
// types (TS5088) that earlier versions elided to `any`
// https://github.com/microsoft/TypeScript/issues/64656
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const types = $.export()

assertEquals<typeof types.List.infer.head.value, number>()

export const sizeOf = match({
	string: s => s.length,
	number: n => n,
	default: "assert"
})

assertEquals<ReturnType<typeof sizeOf>, number>()

export const Id = regex("^id-(\\d+)$")

assertEquals<typeof Id.infer, `id-${number}`>()

// @ts-expect-error invalid keywords are type errors
type({ name: "strng" })
