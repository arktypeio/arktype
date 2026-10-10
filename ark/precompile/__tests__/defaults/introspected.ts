import { type } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

// a site reading a Type's json checks the default arktype checked as it created the Type, whose json lacks it
export const json = type({ a: [["number", ":", isEven], "=", 3] }).omit(
	"a"
).json
