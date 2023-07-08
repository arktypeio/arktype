import type { Dict } from "@arktype/utils"
import { CompiledFunction } from "@arktype/utils"
import type { CompilationContext } from "../compiler/compile.js"
import { createCompilationContext, In } from "../compiler/compile.js"
import { arkKind } from "../compiler/registry.js"
import type { PredicateNode } from "./predicate/predicate.js"
import type { BoundNode } from "./primitive/bound.js"
import type { ClassNode } from "./primitive/class.js"
import type { DivisorNode } from "./primitive/divisor.js"
import type { DomainNode } from "./primitive/domain.js"
import type { NarrowNode } from "./primitive/narrow.js"
import type { RegexNode } from "./primitive/regex.js"
import type { UnitNode } from "./primitive/unit.js"
import type { PropertiesNode } from "./properties/properties.js"
import type { TypeNode } from "./type.js"

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

export type NodeConstructors = {
    type: typeof TypeNode
    domain: typeof DomainNode
    class: typeof ClassNode
    unit: typeof UnitNode
    bound: typeof BoundNode
    divisor: typeof DivisorNode
    regex: typeof RegexNode
    narrow: typeof NarrowNode
    predicate: typeof PredicateNode
    properties: typeof PropertiesNode
}

export type NodeKind = keyof NodeConstructors

export type NodeKinds = {
    [k in NodeKind]: InstanceType<NodeConstructors[k]>
}

export type NodeInputs = {
    [k in NodeKind]: ConstructorParameters<NodeConstructors[k]>[0]
}

export type Node = NodeKinds[NodeKind]
