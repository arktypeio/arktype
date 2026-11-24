// @ts-nocheck
// Calls that take strings but aren't ArkType definitions.
import { hasArkKind } from "@ark/schema"

const factor = (s: string) => s
factor("foo|bar")
or("foo|bar")
hasArkKind("foo[]")
console.log("string | number")
attest(t.expression).snap("string | number")
const plain = "string | number"
const tagged = sql`select * from users where id = ${id}`
const obj = { a: "string | number", b: ["string", "[]"] }
throw new Error("Expected string | number")
