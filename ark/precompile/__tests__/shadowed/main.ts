import { observe } from "./observe.ts"

console.log(JSON.stringify(await observe(), null, "\t"))
