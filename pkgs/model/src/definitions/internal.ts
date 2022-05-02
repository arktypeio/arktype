export * from "../internal.js"
export * from "./parser.js"

export * from "./root.js"

export type ParseTypeContext = {
    delimiter: string
    modifiers: string
}

export type DefaultParseTypeContext = { delimiter: never; modifiers: never }

export interface ParseNode<Kind extends string = string> {
    kind: Kind
}

export interface ShallowNode<Kind extends string = string, T = unknown>
    extends ParseNode<Kind> {
    type: T
}

export interface DeepNode<Kind extends string = string, Children = any>
    extends ParseNode<Kind> {
    children: Children
}
