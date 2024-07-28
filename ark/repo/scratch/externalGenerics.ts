import { type, type Data } from "arktype"

const createBox = <T extends string>(of: Data<T>) =>
	type({
		box: of
	})

const boxType = createBox(type("string"))
//    ^?

// @ts-expect-error
const badBox = createBox(type("number"))

console.log(boxType({ box: 5 }).toString())
console.log(boxType({ box: "foo" }))
