import "./config.ts"

import { scope, type } from "arktype"

export const pkg = type({
	name: "string",
	date: type.match({
		"string | number": s => new Date(s),
		default: () => {
			throw new Error()
		}
	}),
	"metadata?": "string.json.parse",
	"tags?": "(number | string)[]"
})

type Nested = typeof types.nestableToArbitraryDepth.infer

const types = scope({
	obj: {
		foo: "string"
	},
	objArray: "obj[]",
	nestableToArbitraryDepth: {
		key: {
			tupleKey: ["obj[]"]
		}
	}
}).export()
