// @ts-nocheck
import { type, type Type } from "arktype"
import type { string, To } from "arktype/internal/attributes.ts"

const t = type("string.numeric.parse")

type A = Type<{
	age: (In: string.numeric) => To<number>
}>

type B = Type<{
	age: In<string.numeric, Out<number>>
}>

const toDredge = (t: type.Any) => {
	if (t.extends("string")) return "string"
	if (t.extends("number")) return "number"
	if (t.extends("boolean")) return "boolean"
	if (t.extends("Date")) return "date"
	if (t.extends("Array")) return "array"
	if (t.extends("object")) return "object"
	return null
}
