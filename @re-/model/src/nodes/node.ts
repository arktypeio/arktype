import { ModelConfig } from "../model.js"
import { Root } from "./internal.js"

interface Matcher<Parent> {
    matches: (def: Parent) => boolean
}

interface Delegator<T, Parent> extends Matcher<Parent> {
    children: Node<T, T>[]
}

interface Resolver<T, Parent> extends Matcher<Parent> {
    parser: new (def: T, ctx: ParseContext) => Parser<T>
}

export type Node<T extends Parent, Parent> =
    | Delegator<T, Parent>
    | Resolver<T, Parent>

export type ParseContext = {
    path: string[]
    seen: string[]
    shallowSeen: string[]
    config: ModelConfig
    stringRoot: string | null
}

export const defaultParseContext: ParseContext = {
    config: {
        space: {
            dictionary: {},
            config: {}
        }
    },
    path: [],
    seen: [],
    shallowSeen: [],
    stringRoot: null
}

export type ParseFunction<T> = (def: T, ctx: ParseContext) => Parser<T>

export type ParseArgs<T> = {
    def: T
    ctx: ParseContext
    node: Node<any, any>
}

export const parse = <T>({ def, ctx, node }: ParseArgs<T>) => {
    let current = node
    // Traverse down our definition hierarchy to find the matching node
    while ("children" in current) {
        const matchingChild = current.children.find((child) =>
            child.matches(def)
        )
        if (!matchingChild) {
            throw new Error("blah")
        }
        current = matchingChild
    }
    return new current.parser(def, ctx)
}

export abstract class Parser<T> {
    constructor(protected def: T, protected ctx: ParseContext) {}

    parseNext() {
        return parse(this.next())
    }

    abstract next(): ParseArgs<unknown>

    abstract validate(value: unknown): boolean
}
