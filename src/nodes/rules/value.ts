import { hasDomain } from "../../utils/domains.ts"
import type { SerializablePrimitive } from "../../utils/serialize.ts"
import { serializePrimitive } from "../../utils/serialize.ts"
import type { Compilation } from "../compile.ts"
import type { Intersection, Intersection } from "../compose.ts"
import { registerValue } from "../registry.ts"

export class ValueNode {
    constructor(public value: unknown) {}
}
