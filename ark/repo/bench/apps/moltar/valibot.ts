import * as v from "valibot"

export const Moltar = v.object({
	number: v.number(),
	negNumber: v.number(),
	maxNumber: v.number(),
	string: v.string(),
	longString: v.string(),
	boolean: v.boolean(),
	deeplyNested: v.object({
		foo: v.string(),
		num: v.number(),
		bool: v.boolean()
	})
})
