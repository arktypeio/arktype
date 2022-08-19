import { RegexNode } from "./regex.js"

export namespace TerminalObj {
    export type Definition = RegExp

    export type Infer<Def extends Definition> = Def extends RegExp
        ? string
        : never

    export type References<Def extends Definition> = Def extends RegExp
        ? [`/${string}/`]
        : []
}

export const matchesTerminalObj = (
    def: unknown
): def is TerminalObj.Definition => RegexNode.matches(def)

export const parseTerminalObj = (def: TerminalObj.Definition) => {
    return new RegexNode(def)
}
