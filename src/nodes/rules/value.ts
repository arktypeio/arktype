import { compileRegistered } from "../../traverse/store.ts"
import { hasDomain } from "../../utils/domains.ts"
import type { SerializablePrimitive } from "../../utils/serialize.ts"
import { serializePrimitive } from "../../utils/serialize.ts"
import type { Compilation } from "../compile.ts"

export const compileValueCheck = (value: unknown, c: Compilation) => {
    if (hasDomain(value, "object") || typeof value === "symbol") {
        return c.check(
            "value",
            `data === ${compileRegistered(
                "value",
                `${c.type.name}${c.path.length ? "_" + c.path.join("_") : ""}`,
                value
            )}`,
            value
        )
    }
    return c.check(
        "value",
        `data === ${serializePrimitive(value as SerializablePrimitive)}`,
        value as {}
    )
}
