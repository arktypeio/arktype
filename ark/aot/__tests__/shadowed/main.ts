import { observe } from "./observe.ts"

// each mismatch the program catches, raised again where it can't
const reported: string[] = []
process.on("uncaughtException", e => reported.push(String(e)))
const observed = await observe()
await new Promise(resolve => setTimeout(resolve))
console.log(JSON.stringify({ ...observed, reported }, null, "\t"))
