// @ts-nocheck
// Every definition entrypoint the TextMate grammar recognizes, then the
// near misses it must leave alone.
import { ark, generic, match, scope, type } from "arktype"

type("string | number")
generic(["T", "string"])({ value: "T[]" })
scope({ id: "string.uuid" })
define({ name: "string > 0" })
match({ "string | number": v => v, default: "assert" })
fn("string", "number")(s => s.length)
module({ user: "string.email" })
ark("string.date")
Ark("bigint")
arkType("number.integer")
ArkErrors("never")

// member access before the entrypoint
$.type("string[]")
ark.type("boolean")
types.user.type("number % 2")
foo.bar.baz.scope({ a: "string" })
this.type("unknown")
x?.type("null")

// nested entrypoints
type({ inner: type("string | null") })
scope({ a: () => $.type("number") })

// near misses: never highlighted
mytype("string | number")
my_type("string | number")
type<string>("string | number")
type ("string | number")
types("string | number")
typed("string | number")
arkFoo1("string | number")
dark("string | number")
retype("string | number")
new Type("string | number")

// an identifier ending in a non-word char still starts an entrypoint
my$type("string | number")
