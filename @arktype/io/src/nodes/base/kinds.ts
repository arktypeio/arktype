import type { Expression } from "../expression/expression.js"
import type { Structural } from "../structural/structural.js"
import type { Terminal } from "../terminal/terminal.js"
import type { Node } from "./node.js"

export type Kinds = Terminal.Nodes & Structural.Kinds & Expression.Kinds

export type KindName = keyof Kinds

export const topKinds = {
    anyKeyword: 1,
    unknownKeyword: 1
}

export const hasKind = <Name extends KindName>(
    node: Node,
    name: Name
): node is Kinds[Name] => node.kind === name

export const hasKindIn = <Names extends KindName>(
    node: Node,
    names: Record<Names, unknown>
): node is Kinds[Names] => node.kind in names
