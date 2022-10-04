import type { Base } from "../../common.js"
import { Divisibility } from "../../expression/divisibility.js"
import { PrimitiveLiteral } from "../primitiveLiteral.js"
import { Keyword } from "./keyword.js"

export namespace ConstraintKeyword {
    export type Definition = "integer"

    export const nodes: Record<Definition, Base.Node> = {
        integer: new Divisibility.Node(
            Keyword.getNode("number"),
            "%",
            new PrimitiveLiteral.Node("1" as const, 1)
        )
    }
}
