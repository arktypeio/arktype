import { Merge } from "@re-/tools"
import { extractableHandlers } from "./extractable.js"
import { HandledTypes, Node, ParseFunction, Parser } from "./internal.js"
import { unextractableHandlers } from "./unextractable.js"

export namespace Keyword {
    export type Definition = keyof KeywordTypes

    export const handlers = { ...extractableHandlers, ...unextractableHandlers }

    class KeywordParser extends Parser<Definition> {
        // @ts-ignore
        next(): any {
            throw new Error("no")
        }

        validate(value: unknown) {
            return typeof value === this.def
            //handlers[this.def].validate(value)
        }
    }

    export const node: Node<Definition, string> = {
        matches: (def) => def in handlers,
        parser: KeywordParser
    }

    export type KeywordTypes = Merge<
        HandledTypes<typeof handlers>,
        { function: (...args: any[]) => any }
    >

    export const parse: ParseFunction<string> = (def, ctx) => {
        return {
            validate: (value: unknown) => typeof value === def
        }
    }
}
