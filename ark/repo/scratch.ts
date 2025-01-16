import { type } from "arktype"
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

const notFoo = type.string.narrow((s, ctx) => {
	if (s !== "foo") return true
	// ["names", 1]
	console.warn(ctx.path)
	return ctx.mustBe("not foo")
})

const obj = type({
	names: notFoo.array()
})

obj.assert({ names: ["bar", "foo"] }) //?
