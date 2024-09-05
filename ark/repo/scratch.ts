import type { Key } from "@ark/util"
import { type, type Type } from "arktype"

const keysWithNumberValue = <T extends Type<object>>(t: T): T =>
	t.keyof().internal.distribute(
		key => {
			if (!key.hasKind("unit")) {
				throw new Error("Index signatures cannot be mapped")
			}

			const k: Key = key.unit as never

			let value: Type = t.get(key as never)
			return [
				k,
				(value.extends(type.number) ?
					value.or("string.numeric.parse")
				:	value) as Type
			]
		},
		entries => type(Object.fromEntries(entries))
	)

const userType = keysWithNumberValue(
	type({
		userName: "string",
		age: "number"
	})
)

const out = userType({
	userName: "my-name",
	age: "123"
})

console.log(out)
