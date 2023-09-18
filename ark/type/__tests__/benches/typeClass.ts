import type { DynamicBase } from "@arktype/util"
import type { Ark } from "../../scopes/ark.js"
import type { inferTypeRoot, validateTypeRoot } from "../../type.js"

export type ClassParser<$> = <def>(
	def: validateTypeRoot<def, $>
) => inferTypeRoot<def, $> extends infer t extends object
	? typeof DynamicBase<t>
	: never

declare const Class: ClassParser<Ark>

class Foo extends Class({ a: "string|number[]" }) {}

const n = new Foo({} as never)

const z = n.a
//    ^?
