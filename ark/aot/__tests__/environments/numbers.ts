import { type } from "arktype"

export const Large = type(
	"number > 100000000000000000000000 | number < -1234567.5"
)

export const Small = type("0.000001 <= number <= 0.1")

export const Stepped = type("number % 1000000")

export const Big = type("bigint | 1234567890123456789n")

export const Lengths = type("string <= 1000000 | number[] >= 10000")
