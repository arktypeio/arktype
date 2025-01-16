import { scope, type } from "arktype"
import { Disjoint } from "../schema/shared/disjoint.ts"
import { buildApi, jsDocGen } from "./jsDocGen.ts"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }

const uniqueStrings = type("string[]").narrow((arr, ctx) => {
	const seen: Record<string, number> = {}
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] in seen) {
			return ctx.reject({
				expected: "a unique string",
				actual: `a duplicate of '${arr[i]}' at index ${seen[arr[i]]}`,
				relativePath: [i]
			})
		} else seen[arr[i]] = i
	}
	return true
})

//   const notFoo = type.string.narrow((s, ctx) => {
//       if (s !== "foo") return true
//       // ["names", 1]
//       console.warn(ctx.path)
//       return ctx.mustBe("not foo")
//   })

//  const obj = type({
//       names: notFoo.array()
//   })

//  // ArkErrors: names[1] must be not foo (was "foo")
//  obj({ names: ["bar", "foo"] })

const closedObjectScope = scope(
	{
		user: {
			name: "string"
		}
	},
	{
		onUndeclaredKey: "reject"
	}
)
const types = closedObjectScope.export()
types.user({ name: "Alice", age: 99 }).toString() //?

const user = type({
	password: "string >= 8"
}).configure({
	message: ctx =>
		`${ctx.propString || "(root)"}: ${ctx.actual} isn't ${ctx.expected}`
})
// ArkErrors: (root): a string isn't an object
const out1 = user("ez123")
// but `.configure` only applies shallowly, so the nested error isn't changed!
// ArkErrors: password must be at least length 8 (was 5)
const out2 = user({ password: "ez123" })

const mod = type.module(
	{ isEven: "number%2" },
	{
		divisor: {
			expected: ctx => `% ${ctx.rule} !== 0`,
			problem: ctx => `${ctx.actual} ${ctx.expected}`
		}
	}
)
// ArkErrors: 3 % 2 !== 0
mod.isEven(3)
