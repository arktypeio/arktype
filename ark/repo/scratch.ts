// @ts-nocheck

import { bench } from "@ark/attest"
import type { Brand } from "@ark/util"
import { ark, type } from "arktype"
import { Traversal } from "../schema/shared/traversal.ts"

const $ = {
	intersection214Allows(data, ctx) {
		if (!this.domain74Allows(data)) {
			return false
		}
		if (!this.structure15Allows(data)) {
			return false
		}
		return true
	},
	intersection214Apply(data, ctx) {
		const errorCount = ctx.currentErrorCount
		this.domain74Apply(data, ctx)
		if (ctx.currentErrorCount > errorCount) {
			return
		}
		this.structure15Apply(data, ctx)
	},
	domain74Allows(data, ctx) {
		return (
			(typeof data === "object" && data !== null) || typeof data === "function"
		)
	},
	domain74Apply(data, ctx) {
		if (
			(typeof data !== "object" || data === null) &&
			typeof data !== "function"
		) {
			ctx.errorFromNodeContext({
				code: "domain",
				description: "an object",
				meta: $ark.object137,
				domain: "object"
			})
		}
	},
	structure15Allows(data, ctx) {
		if (!this.required6Allows(data)) {
			return false
		}
		if (!this.required15Allows(data)) {
			return false
		}
		if (!this.required5Allows(data)) {
			return false
		}
		if (!this.required3Allows(data)) {
			return false
		}
		if (!this.required2Allows(data)) {
			return false
		}
		if (!this.required1Allows(data)) {
			return false
		}
		if (!this.required4Allows(data)) {
			return false
		}
		return true
	},
	structure15Apply(data, ctx) {
		const errorCount = ctx.currentErrorCount
		this.required6Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		this.required15Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		this.required5Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		this.required3Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		this.required2Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		this.required1Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		this.required4Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		if (ctx && !ctx.hasError()) {
			ctx.queueMorphs([
				data => {
					for (const k in data) {
						if (false) {
							delete data[k]
						}
					}
				}
			])
		}
	},
	required6Allows(data, ctx) {
		if ("boolean" in data) {
			if (!this.boolean1Allows(data.boolean)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required6Apply(data, ctx) {
		if ("boolean" in data) {
			ctx.path.push("boolean")
			this.boolean1Apply(data.boolean, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "boolean",
				relativePath: $ark.array5,
				meta: $ark.object143
			})
		}
	},
	boolean1Allows(data, ctx) {
		if (this.unit9Allows(data)) {
			return true
		}
		if (this.unit10Allows(data)) {
			return true
		}
		return false
	},
	boolean1Apply(data, ctx) {
		const errors = []
		ctx.pushBranch()
		this.unit9Apply(data, ctx)
		if (!ctx.hasError()) {
			return ctx.popBranch()
		}
		errors.push(ctx.popBranch().error)
		ctx.pushBranch()
		this.unit10Apply(data, ctx)
		if (!ctx.hasError()) {
			return ctx.popBranch()
		}
		errors.push(ctx.popBranch().error)
		ctx.errorFromNodeContext({ code: "union", errors, meta: {} })
	},
	boolean1Optimistic(data, ctx) {
		if (this.unit9Allows(data)) {
			return data
		}
		if (this.unit10Allows(data)) {
			return data
		}
		return " represents an uninitialized value"
	},
	unit9Allows(data, ctx) {
		return data === false
	},
	unit9Apply(data, ctx) {
		if (data !== false) {
			ctx.errorFromNodeContext({
				code: "unit",
				description: "false",
				meta: $ark.object11,
				unit: false
			})
		}
	},
	unit10Allows(data, ctx) {
		return data === true
	},
	unit10Apply(data, ctx) {
		if (data !== true) {
			ctx.errorFromNodeContext({
				code: "unit",
				description: "true",
				meta: $ark.object12,
				unit: true
			})
		}
	},
	required15Allows(data, ctx) {
		if ("deeplyNested" in data) {
			if (!this.intersection211Allows(data.deeplyNested)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required15Apply(data, ctx) {
		if ("deeplyNested" in data) {
			ctx.path.push("deeplyNested")
			this.intersection211Apply(data.deeplyNested, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "an object",
				relativePath: $ark.array10,
				meta: $ark.object148
			})
		}
	},
	intersection211Allows(data, ctx) {
		if (!this.domain74Allows(data)) {
			return false
		}
		if (!this.structure14Allows(data)) {
			return false
		}
		return true
	},
	intersection211Apply(data, ctx) {
		const errorCount = ctx.currentErrorCount
		this.domain74Apply(data, ctx)
		if (ctx.currentErrorCount > errorCount) {
			return
		}
		this.structure14Apply(data, ctx)
	},
	structure14Allows(data, ctx) {
		if (!this.required9Allows(data)) {
			return false
		}
		if (!this.required7Allows(data)) {
			return false
		}
		if (!this.required8Allows(data)) {
			return false
		}
		return true
	},
	structure14Apply(data, ctx) {
		const errorCount = ctx.currentErrorCount
		this.required9Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		this.required7Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		this.required8Apply(data, ctx)
		if (ctx.failFast && ctx.currentErrorCount > errorCount) {
			return
		}
		if (ctx && !ctx.hasError()) {
			ctx.queueMorphs([
				data => {
					for (const k in data) {
						if (false) {
							delete data[k]
						}
					}
				}
			])
		}
	},
	required9Allows(data, ctx) {
		if ("bool" in data) {
			if (!this.boolean1Allows(data.bool)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required9Apply(data, ctx) {
		if ("bool" in data) {
			ctx.path.push("bool")
			this.boolean1Apply(data.bool, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "boolean",
				relativePath: $ark.array8,
				meta: $ark.object146
			})
		}
	},
	required7Allows(data, ctx) {
		if ("foo" in data) {
			if (!this.string1Allows(data.foo)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required7Apply(data, ctx) {
		if ("foo" in data) {
			ctx.path.push("foo")
			this.string1Apply(data.foo, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "a string",
				relativePath: $ark.array6,
				meta: $ark.object144
			})
		}
	},
	string1Allows(data, ctx) {
		return typeof data === "string"
	},
	string1Apply(data, ctx) {
		if (typeof data !== "string") {
			ctx.errorFromNodeContext({
				code: "domain",
				description: "a string",
				meta: $ark.object16,
				domain: "string"
			})
		}
	},
	required8Allows(data, ctx) {
		if ("num" in data) {
			if (!this.number1Allows(data.num)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required8Apply(data, ctx) {
		if ("num" in data) {
			ctx.path.push("num")
			this.number1Apply(data.num, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "a number",
				relativePath: $ark.array7,
				meta: $ark.object145
			})
		}
	},
	number1Allows(data, ctx) {
		return typeof data === "number" && !Number.isNaN(data)
	},
	number1Apply(data, ctx) {
		if (typeof data !== "number" || Number.isNaN(data)) {
			ctx.errorFromNodeContext({
				code: "domain",
				description: "a number",
				meta: $ark.object14,
				domain: "number"
			})
		}
	},
	required5Allows(data, ctx) {
		if ("longString" in data) {
			if (!this.string1Allows(data.longString)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required5Apply(data, ctx) {
		if ("longString" in data) {
			ctx.path.push("longString")
			this.string1Apply(data.longString, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "a string",
				relativePath: $ark.array4,
				meta: $ark.object142
			})
		}
	},
	required3Allows(data, ctx) {
		if ("maxNumber" in data) {
			if (!this.number1Allows(data.maxNumber)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required3Apply(data, ctx) {
		if ("maxNumber" in data) {
			ctx.path.push("maxNumber")
			this.number1Apply(data.maxNumber, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "a number",
				relativePath: $ark.array2,
				meta: $ark.object140
			})
		}
	},
	required2Allows(data, ctx) {
		if ("negNumber" in data) {
			if (!this.number1Allows(data.negNumber)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required2Apply(data, ctx) {
		if ("negNumber" in data) {
			ctx.path.push("negNumber")
			this.number1Apply(data.negNumber, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "a number",
				relativePath: $ark.array1,
				meta: $ark.object139
			})
		}
	},
	required1Allows(data, ctx) {
		if ("number" in data) {
			if (!this.number1Allows(data.number)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required1Apply(data, ctx) {
		if ("number" in data) {
			ctx.path.push("number")
			this.number1Apply(data.number, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "a number",
				relativePath: $ark.array,
				meta: $ark.object138
			})
		}
	},
	required4Allows(data, ctx) {
		if ("string" in data) {
			if (!this.string1Allows(data.string)) {
				return false
			}
		} else {
			return false
		}
		return true
	},
	required4Apply(data, ctx) {
		if ("string" in data) {
			ctx.path.push("string")
			this.string1Apply(data.string, ctx)
			ctx.path.pop()
		} else {
			ctx.errorFromNodeContext({
				code: "required",
				missingValueDescription: "a string",
				relativePath: $ark.array3,
				meta: $ark.object141
			})
		}
	}
}

export const validData = {
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
	boolean: true,
	deeplyNested: {
		foo: "bar",
		num: 1,
		bool: false
	}
}

// bench("allows", () => {
// 	$.intersection214Allows(validData)
// }).median([4.77, "ns"])

// bench("apply", () => {
// 	if($.intersection214Allows(
// 		validData,
// 	)
// }).median([2.92, "us"])

// bench("ark", () => {
// 	return t.assert(validData)
// }).median([5.57, "us"])

// const zodT = z.object({
// 	number: z.number(),
// 	negNumber: z.number(),
// 	maxNumber: z.number(),
// 	string: z.string(),
// 	longString: z.string(),
// 	boolean: z.boolean()
// })

// bench("zod", () => {
// 	return zodT.parse(validData)
// }).median([584.8, "ns"])

// const user = type({
// 	name: "string",
// 	isAdmin: "boolean = false",
// 	"age?": "number"
// })

// const defaultableProps = user.props.filter(
// 	p => p.kind === "optional" && "default" in p
// )

// const nanToNull = type("number.NaN").pipe(() => null, type.null)

// const nullNumber = type("number").or(nanToNull)

// const out = nullNumber(5) // 5
// const out2 = nullNumber(Number.NaN) // null

// console.log(nullNumber.out.distribute(branch => branch.expression)) // ["number", "null"]
