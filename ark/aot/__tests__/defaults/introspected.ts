import { type } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

// reading json checks the default arktype checked creating the Type
export const json = type({ a: [["number", ":", isEven], "=", 3] }).omit(
	"a"
).json
