import { Merge } from "@re-/tools"
import { extractableHandlers } from "./extractable.js"
import { HandledTypes, TerminalNode } from "./internal.js"
import { unextractableHandlers } from "./unextractable.js"

export namespace Keyword {
    export type Definition = keyof KeywordTypes

    export const handlers = { ...extractableHandlers, ...unextractableHandlers }

    export type KeywordTypes = Merge<
        HandledTypes<typeof handlers>,
        { function: (...args: any[]) => any }
    >

    export class Node extends TerminalNode<Definition> {
        validate(value: unknown) {
            return typeof value === this.def
        }

        generate() {
            return this.def === "string" ? "" : undefined
        }
    }
}
