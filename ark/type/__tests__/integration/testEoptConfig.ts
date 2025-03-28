import "./eoptConfig.ts"

import { type } from "arktype"
import { equal } from "node:assert/strict"
import { cases } from "./util.ts"

cases({
	fromDef: () => {
		const o = type({
			"name?": "string"
		})

		equal(o.expression, "{ name?: string | undefined }")
	},
	fromRef: () => {
		const o = type({
			"name?": type.string
		})

		equal(o.expression, "{ name?: string | undefined }")
	}
})
