import type { inferDomain } from "./domain.ts"
import type { BigintLiteral } from "./numericLiterals.ts"

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

export const serializePrimitive = <value extends SerializablePrimitive>(
	value: value
): serializePrimitive<value> =>
	(typeof value === "string" ? JSON.stringify(value)
	: typeof value === "bigint" ? `${value}n`
	: `${value}`) as never

export type serializePrimitive<value extends SerializablePrimitive> =
	value extends string ? `"${value}"`
	: value extends bigint ? `${value}n`
	: `${value}`
