import { scope, type } from "arktype"

const isLong = (s: string) => s.length > 3

export const Scoped = scope(
	{ T: "string" },
	{ domain: { message: "no" } }
).export()
export const Narrowed = type("string").narrow(isLong)
export const Union = type("string | number").configure({
	message: ctx => `${ctx.problem}!`
})
