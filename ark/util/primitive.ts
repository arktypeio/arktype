import type { inferDomain } from "./domain.ts"
import type { BigintLiteral } from "./numbers.ts"

type SerializedString<value extends string = string> = `"${value}"`

export type SerializedPrimitives = {
	string: SerializedString
	number: `${number}`
	bigint: BigintLiteral
	boolean: "true" | "false"
	null: "null"
	undefined: "undefined"
}

export type SerializedPrimitive =
	SerializedPrimitives[keyof SerializedPrimitives]

export type SerializablePrimitive = inferDomain<keyof SerializedPrimitives>

// a union's errors print the same data, so cache the last string
let lastString: string | undefined
let lastSerialized: string

export const serializePrimitive = <value extends SerializablePrimitive>(
	value: value
): serializePrimitive<value> =>
	(typeof value === "string" ?
		value === lastString ?
			lastSerialized
		:	(lastSerialized = JSON.stringify((lastString = value)))
	: typeof value === "bigint" ? `${value}n`
	: `${value}`) as never

export type serializePrimitive<value extends SerializablePrimitive> =
	value extends string ? `"${value}"`
	: value extends bigint ? `${value}n`
	: `${value}`
