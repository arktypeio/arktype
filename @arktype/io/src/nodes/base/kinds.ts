import type { Expression } from "../expression/expression.js"
import type { Structural } from "../structural/structural.js"
import type { Terminal } from "../terminal/terminal.js"

export type Kinds = Terminal.Kinds & Structural.Kinds & Expression.Kinds

export type KindName = keyof Kinds

export const topKinds = {
    anyKeyword: 1,
    unknownKeyword: 1
}

type InternalNodeKey = "traverse" | "definitionRequiresStructure"

export type ExternalNodes = {
    [Name in KindName]: Omit<Kinds[Name], InternalNodeKey>
}

export type NodeConfig<Name extends KindName> = {}
