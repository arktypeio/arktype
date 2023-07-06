import { CompiledFunction } from "@arktype/utils"
import type { CompilationContext } from "../compiler/compile.js"
import {
    createCompilationContext,
    InputParameterName
} from "../compiler/compile.js"
import { arkKind } from "../compiler/registry.js"
import type { NodeKind, NodeKinds } from "../nodes/kinds.js"
import type { BasisKind } from "../nodes/primitive/basis/basis.js"

export abstract class BaseNode<rule = unknown, meta = {}> {
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
            InputParameterName,
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

    isBasis(): this is NodeKinds[BasisKind] {
        return (
            this.kind === "domain" ||
            this.kind === "class" ||
            this.kind === "value"
        )
    }
}
