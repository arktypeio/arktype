import { type, type Type } from "arktype"

const createBox = <T extends string>(of: Type<T>) =>
	type({
		box: of
	})

const boxType = createBox(type("string"))
//    ^?

// @ts-expect-error
const badBox = createBox(type("number"))

console.log(boxType({ box: 5 }).problems?.summary)
console.log(boxType({ box: "foo" }).data)
