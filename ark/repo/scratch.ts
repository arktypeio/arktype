import { type } from "arktype"

const original = type({
	id: "string",
	name: "string",
	"favoriteColor?": "string"
})

const updateSchema = original.map(prop =>
	prop.key === "name" ?
		{
			...prop,
			// update key name if needed
			key: `prefix${prop.key}` as const,
			// update optionality if needed
			kind: "optional",
			// update value if needed
			value: prop.value.or(type.null)
		}
	:	prop
)

type Result = {
	id: string
	favoriteColor?: string
	prefixname?: string | null
}

/* updateSchema:
{
id: "string",
"name?": "string"
"favoriteColor?": "string | null"
}
*/
