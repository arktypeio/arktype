import { register } from "@ark/precompile/node"

register({ conditions: ["ark-ts"], cwd: import.meta.dirname })

const { type } = await import("arktype")

console.log(type("string").expression)
