import { compile, parse } from ".."
import { expectType, expectError, printType } from "tsd"
import { typeDefProxy } from "../common.js"
import { context, typeOf } from "./testContext.js"
// import { assert } from "console"

assert(compile({ a: "string" }.types.a.type)).type()
assert(compile({ a: "string" }.types.a.type)).type.errors()
assert(compile({ a: "string" }.types.a.type)).value()
assert(compile({ a: "string" }.types.a.type)).value.returns()
assert(compile({ a: "string" }.types.a.type)).value.throws()
check(compile({ a: "string" }.types.a.type)).type()
check(compile({ a: "string" }.types.a.type)).type.errors()
check(compile({ a: "string" }.types.a.type)).value()
check(compile({ a: "string" }.types.a.type)).value.returns()
check(compile({ a: "string" }.types.a.type)).value.throws()
