import "./eoptConfig.ts"

import { type } from "arktype"
import { equal } from "node:assert/strict"
import { cases } from "./util.ts"

cases({
	fromDef: () => {
		const O = type({
			"name?": "string"
		})

		equal(O.expression, "{ name?: string | undefined }")
	},
	fromRef: () => {
		const O = type({
			"name?": type.string
		})

		equal(O.expression, "{ name?: string | undefined }")
	}
})
