import type { Base } from "../../common.js"
import { Divisibility } from "../../expression/infix/divisibility.js"
import { PrimitiveLiteral } from "../primitiveLiteral.js"
import { TypeKeyword } from "./types/typeKeyword.js"

export namespace ConstrainedKeyword {
    export type Definition = "integer"

    export const nodes: Record<Definition, Base.Node> = {
        integer: new Divisibility.Node(
            TypeKeyword.nodes["number"],
            "%",
            new PrimitiveLiteral.Node("1" as const, 1)
        )
    }
}
