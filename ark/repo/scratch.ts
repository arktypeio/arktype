import { type } from "arktype"

const foo = type([])

console.log(foo.json)

foo([1]) //?
