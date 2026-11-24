// @ts-nocheck
// All 14 chained methods, each with a string definition argument.
import { type } from "arktype"

const Base = type("string")

Base.and("string.email")
Base.or("number | null")
Base.case("string", s => s)
Base.in("string | number")
Base.extends("string")
Base.ifExtends("string")
Base.intersect("string > 5")
Base.merge({ age: "number.integer >= 0" })
Base.exclude("'a' | 'b'")
Base.extract("'a' | 'b'")
Base.overlaps("string")
Base.subsumes("never")
Base.to("string.trim")
Base.satisfies("string")

// chained on a call and across lines
type("string").or("number").and("unknown")
type({ a: "string" })
	.merge({ b: "number" })
	.or({ c: "boolean[]" })

// unknown or unchained methods: never highlighted
Base.pipe("string | number")
Base.narrow("string | number")
Base.anythingNotAKnownChainedMethod("string | number")
Base.orElse("string | number")
or("string | number")
and("string | number")
to("string | number")
Base.or ("string | number")
