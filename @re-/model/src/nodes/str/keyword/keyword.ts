import { Merge } from "@re-/tools"
import { extractableHandlers } from "./extractable.js"
import { BaseNodeClass, HandledTypes, TerminalNode } from "./internal.js"
import { unextractableHandlers } from "./unextractable.js"

export namespace Keyword {
    export type Definition = keyof KeywordTypes

    export const handlers = { ...extractableHandlers, ...unextractableHandlers }

    export type KeywordTypes = Merge<
        HandledTypes<typeof handlers>,
        { function: (...args: any[]) => any }
    >

    export const Node: BaseNodeClass<
        Definition,
        string
    > = class extends TerminalNode<Definition> {
        static matches(def: string): def is Definition {
            return def in handlers
        }

        validate(value: unknown) {
            return typeof value === this.def
        }

        generate() {
            return this.def === "string" ? "" : undefined
        }
    }
}
