import type { Dict } from "@arktype/utils"
import { CompiledFunction } from "@arktype/utils"
import type { CompilationContext } from "../compiler/compile.js"
import { createCompilationContext, In } from "../compiler/compile.js"
import { arkKind } from "../compiler/registry.js"
import type { Disjoint } from "./disjoint.js"
import type { Node, NodeKind, NodeKinds } from "./kinds.js"
import type { BasisKind } from "./primitive/basis.js"

export type NodeConfig = {
    rule: unknown
    meta: Dict
    intersection: unknown
}

export abstract class NodeBase<config extends NodeConfig> {
    readonly [arkKind] = "node"
    abstract readonly kind: NodeKind
    readonly condition: string
    readonly description: string

    // TODO: test with cyclic nodes
    allows: (data: unknown) => boolean

    constructor(
        public rule: config["rule"],
        public meta: config["meta"]
    ) {
        this.condition = this.compile(createCompilationContext("true", "false"))
        this.allows = new CompiledFunction(
            In,
            `${this.condition}
        return true`
        )
        this.description = this.describe()
    }

    abstract compile(ctx: CompilationContext): string
    abstract intersect(
        other: config["intersection"]
    ): config["intersection"] | Disjoint

    protected abstract describe(): string

    toString() {
        return this.description
    }

    hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
        return this.kind === kind
    }

    isBasis(): this is Node<BasisKind> {
        return (
            this.kind === "domain" ||
            this.kind === "class" ||
            this.kind === "unit"
        )
    }
}
