import { CompiledFunction } from "@arktype/utils"
import type { CompilationContext } from "../compiler/compile.js"
import { createCompilationContext, In } from "../compiler/compile.js"
import { arkKind } from "../compiler/registry.js"

// interface StaticBaseNode<node> {
//     new (...args: never[]): node

//     intersect(l: node, r: node): node | Disjoint
// }

//     subclass extends StaticBaseNode<InstanceType<subclass>>

export abstract class NodeBase<rule, meta> {
    readonly [arkKind] = "node"
    abstract readonly kind: NodeKind
    readonly condition: string
    readonly description: string

    // TODO: test with cyclic nodes
    allows: (data: unknown) => boolean

    constructor(
        public readonly rule: rule,
        public readonly meta: meta
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
    protected abstract describe(): string

    toString() {
        return this.description
    }

    // TODO: fix narrowing
    hasKind<kind extends NodeKind>(kind: kind): this is this {
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

export const precedenceByKind = {
    // roots
    type: 0,
    // predicate: 0,
    // basis checks
    domain: 1,
    class: 1,
    unit: 1,
    // shallow checks
    bound: 2,
    divisor: 2,
    regex: 2,
    // deep checks
    // props: 3,
    // narrows
    narrow: 4
} as const satisfies Record<NodeKind, number>

export type NodeKinds = {
    type: TypeNode
    domain: DomainNode
    class: ClassNode
    unit: UnitNode
    bound: BoundNode
    divisor: DivisorNode
    regex: RegexNode
    narrow: NarrowNode
}

export type NodeKind = keyof NodeKinds
