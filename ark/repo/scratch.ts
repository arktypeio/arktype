import { type } from "arktype"

const original = type({
	bar: "number"
})

// correctly adds null to bar's value
const variableNullable = original.map(prop => {
	//     ^?
	const nullableValue = prop.value.or("null")
	return {
		key: prop.key,
		value: nullableValue
	}
})

// ignores the .or("null") and returns the original value
const inlinedNullable = original.map(prop => ({
	//    ^?
	key: prop.key,
	value: prop.value.or("null")
}))
