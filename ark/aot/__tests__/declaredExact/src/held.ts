import { type } from "arktype"
import { Optional } from "./index.ts"

export const Draft = type({
	"title?": "string",
	"tags?": "string[] | undefined",
	count: "number = 0",
	"parent?": Optional
})

const read = <i, o>(schema: { inferIn: i; infer: o }) =>
	({ pair: [schema.infer] }) as {
		input?: i
		output?: o | undefined
		either?: i | o
		pair: [o, i?]
	}

// each optional key or element holds one of Draft's shapes, without undefined
// or beside one that was written
export const draft = read(Draft)

export const optional = read(Optional)
