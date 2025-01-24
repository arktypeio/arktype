import { scope, type } from "arktype"

const myScope = scope(
	{ user: { age: "number < 100" } },
	{
		max: {
			actual: () => "unacceptably large"
		}
	}
)
const types = myScope.export()
// ArkErrors: age must be less than 100 (was unacceptably large)
types.user({ name: "Alice", age: 101 })
const parsedAfter = myScope.type({
	age: "number <= 100"
})
// ArkErrors: age must be at most 100 (was unacceptably large)
parsedAfter({ age: 101 })
