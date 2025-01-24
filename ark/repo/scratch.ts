import { scope, type } from "arktype"

const preference = type({
	key: "string",
	value: "string|number|boolean"
})

console.log(
	preference.get("value").internal.assertHasKind("union").discriminantJson
)

console.log(preference.internal.includesMorph)

const preferences = preference.array()

console.log(preferences.internal.includesMorph)

const userSchemaArktype = type({
	id: "string",
	email: "string",
	profile: {
		firstName: "string",
		lastName: "string",
		age: "number",
		preferences: preference.array()
	},
	metadata: "Record<string,unknown>",
	createdAt: "Date",
	"updatedAt?": "Date"
})

console.log(userSchemaArktype.internal.allowsRequiresContext)
console.log(userSchemaArktype.internal.includesMorph)

const validUserData = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	email: "test@example.com",
	profile: {
		firstName: "John",
		lastName: "Doe",
		age: 30,
		preferences: [
			{ key: "theme", value: "dark" },
			{ key: "notifications", value: true }
		]
	},
	metadata: {
		lastLogin: "2024-01-17T00:00:00.000Z"
	},
	createdAt: new Date()
}

const result = userSchemaArktype(validUserData)
