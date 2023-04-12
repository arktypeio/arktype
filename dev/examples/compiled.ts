// @ts-ignore
import { format } from "prettier"
import { type } from "../../src/main.js"

const myType = type({ even: "number%2" })

console.log(format(myType.compiled))

console.log(myType({ even: 3 }).problems?.summary)
console.log(myType({ even: "" }).problems?.summary)
console.log(myType({ even: 2 }).data)
