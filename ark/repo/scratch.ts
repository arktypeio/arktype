import { type } from "arktype"

const userType = type({
	intent: "'profile'",
	name: "string>0",
	surname: "string>4"
}).or({
	intent: "'private'",
	password: "string>0"
})

const profileIntent = userType.extract({ intent: "'profile'" })

console.log(profileIntent.expression)
