/* eslint-disable @typescript-eslint/no-restricted-imports */
import { compile, node } from "./ark/schema/main.js"

// 2, 3, 6, 9
const l = node(
	{
		domain: "number",
		divisor: 2
	},
	{
		domain: "number",
		divisor: 3
	}
)

const result = compile(l) //?
