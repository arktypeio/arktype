import type { Dict } from "@arktype/utils"
import { CompiledFunction } from "@arktype/utils"
import type { CompilationContext } from "../compiler/compile.js"
import { createCompilationContext, In } from "../compiler/compile.js"
import { arkKind } from "../compiler/registry.js"
import type { NodeKind, NodeKinds } from "./node.js"

// interface StaticBaseNode<node> {
//     new (...args: never[]): node

//     intersect(l: node, r: node): node | Disjoint
// }

//     subclass extends StaticBaseNode<InstanceType<subclass>>

export abstract class NodeBase {
    readonly [arkKind] = "node"
    abstract readonly kind: NodeKind
    abstract readonly meta: Dict
    readonly condition: string
    readonly description: string

    // TODO: test with cyclic nodes
    allows: (data: unknown) => boolean

    constructor() {
        this.condition = this.compile(createCompilationContext("true", "false"))
        this.allows = new CompiledFunction(
            In,
            `${this.condition}
        return true`
        )
        this.description = this.describe()
    }

    abstract compile(ctx: CompilationContext): string
    protected abstract describe(): string

    toString() {
        return this.description
    }

    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind] {
        return this.kind === kind
    }

    isBasis(): this is this {
        return (
            this.kind === "domain" ||
            this.kind === "class" ||
            this.kind === "unit"
        )
    }
}
