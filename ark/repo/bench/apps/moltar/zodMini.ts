import * as z from "zod/mini"

export const Moltar = z.object({
	number: z.number(),
	negNumber: z.number(),
	maxNumber: z.number(),
	string: z.string(),
	longString: z.string(),
	boolean: z.boolean(),
	deeplyNested: z.object({
		foo: z.string(),
		num: z.number(),
		bool: z.boolean()
	})
})
