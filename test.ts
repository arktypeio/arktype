import { type } from "arktype"
import type { CastTo } from "./ark/schema/main.js"

const splitAndValidate = type("string").morph((s) => s, [/foo/, "[]"])
//    ^?

const splitAndValidateNarrowed = type("string").morph(
	(s) => s,
	[/foo/ as CastTo<`${string}${"foo"}${string}`>, "[]"]
)
