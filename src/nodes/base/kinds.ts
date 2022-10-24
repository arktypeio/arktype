import type { Evaluate } from "../../utils/generics.js"
import type { Expression } from "../expression/expression.js"
import type { Structural } from "../structural/structural.js"
import type { Terminal } from "../terminal/terminal.js"
import type { Node } from "./node.js"

export type Kinds = Terminal.Kinds & Structural.Kinds & Expression.Kinds

export type KindName = keyof Kinds

export const topKinds = {
    anyKeyword: 1,
    unknownKeyword: 1
}

type InternalNodeKey =
    | "traverse"
    | "definitionRequiresStructure"
    | "children"
    | "child"

export type ExternalNodes = {
    [name in KindName]: ExternalizeNode<Kinds[name]>
}

export type ExternalizeNode<kind extends Node> = Evaluate<
    Omit<kind, InternalNodeKey> & {
        children: kind["children"] extends Node[]
            ? ExternalizeChildren<kind["children"]>
            : undefined
    } & ("child" extends keyof kind
            ? kind["child"] extends Node
                ? { child: ExternalizeNode<kind["child"]> }
                : {}
            : {})
>

type ExternalizeChildren<children extends Node[]> = {
    [i in keyof children]: ExternalizeNode<children[i]>
}

export type NodeConfigs = { [Name in KindName]?: Config<Name> }

export type Config<Name extends KindName> = {
    describe?: (children: ExternalNodes[Name]["children"]) => string
}
