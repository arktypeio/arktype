import type { DateLiteral } from "../../../attributes.ts"

export const isDateLiteral = (value: unknown): value is DateLiteral =>
	typeof value === "string" &&
	value[0] === "d" &&
	(value[1] === "'" || value[1] === '"') &&
	value[value.length - 1] === value[1]

export const extractDateLiteralSource = <literal extends DateLiteral>(
	literal: literal
): extractDateLiteralSource<literal> => literal.slice(2, -1) as never

type extractDateLiteralSource<literal extends DateLiteral> =
	literal extends DateLiteral<infer source> ? source : never

export type DateInput = ConstructorParameters<typeof Date>[0]
