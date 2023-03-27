import type { Narrow } from "../../parse/ast/narrow"
import type { Compilation } from "../compile.ts"
import { registerRegex } from "../registry.ts"
import { SetRule } from "./rule.ts"

export class NarrowRule extends SetRule<"narrow", Narrow> {
    readonly kind = "narrow"

    compile(): string {
        return "(narrow unimplemented)"
    }
}
