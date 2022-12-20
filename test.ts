import { type } from "arktype"

console.log(type("string").assert("Arktype"))
console.log(type("'abc'").root)
