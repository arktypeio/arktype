import { Iterate } from "@re-/tools"
import * as Node from "../node/exports.js"
export * as Node from "../node/exports.js"
export * as Utils from "../utils.js"
export * as Parser from "./parser/index.js"

export type NodeToString<T, Result extends string = ""> = T extends Iterate<
    infer Next,
    infer Rest
>
    ? NodeToString<Rest, `${Result}${NodeToString<Next>}`>
    : T extends string
    ? `${Result}${T}`
    : Result

export type strNode = Node.base & { tree: StrTree }

export type StrTree = string | StrTree[]

export type NonTerminalTree = (string | NonTerminalTree)[]

export type Affixes = {
    optional?: true
    bounds?: {}
}

export abstract class link<Child extends strNode = strNode> extends Node.base {
    constructor(protected child: Child, protected ctx: Node.context) {
        super()
    }

    abstract get tree(): NonTerminalTree

    toString() {
        return this.tree.flatMap((_) => _).join("")
    }

    collectReferences(
        opts: Node.References.Options,
        collected: Node.References.Collection
    ) {
        this.child.collectReferences(opts, collected)
    }
}

export class str extends link {
    constructor(child: strNode, ctx: Node.context, private affixes: Affixes) {
        super(child, ctx)
    }

    isOptional() {
        return !!this.affixes.optional
    }

    get tree() {
        let root = this.child.tree
        if (this.isOptional()) {
            root = [root, "?"]
        }
        return [root, ";"]
    }

    allows(args: Node.Allows.Args) {
        if (this.isOptional() && args.value === undefined) {
            return true
        }
        return this.child.allows(args)
    }

    create(args: Node.Create.Args) {
        if (this.isOptional()) {
            return undefined
        }
        return this.child.create(args)
    }
}
