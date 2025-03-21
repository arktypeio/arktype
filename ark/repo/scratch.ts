import { type } from "arktype"

// export type RecursiveArray = {
// 	label: string
// 	nested?: this
// }[]

export const recursiveArray = type(
	{
		label: "string",
		"nested?": "this"
	},
	"[]"
)
