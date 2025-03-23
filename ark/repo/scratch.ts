import { type } from "arktype"

const values = type("'red' | 'blue'")
	.select("unit")
	.map(u => u.unit) //?
