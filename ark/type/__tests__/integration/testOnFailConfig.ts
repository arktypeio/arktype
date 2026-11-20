import "./onFailConfig.ts"

import { type } from "arktype"
import { deepStrictEqual, throws } from "node:assert/strict"
import { cases } from "./util.ts"

cases({
	throwsOnFail: () => {
		throws(() => {
			type.string(5)
		}, /must be a string/)
	},
	standardValidateReturnsIssues: () => {
		const { issues } = type.string["~standard"].validate(5) as {
			issues?: readonly { message: string }[]
		}
		deepStrictEqual(
			issues?.map(issue => issue.message),
			["must be a string"]
		)
	}
})
