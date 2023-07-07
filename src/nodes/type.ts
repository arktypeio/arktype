import type { Thunk } from "@arktype/utils"
import { hasKey, isArray } from "@arktype/utils"
import type { CompilationContext } from "../compiler/compile.js"
import { inferred } from "../parser/definition.js"
import type { inferIntersection } from "../parser/semantic/intersections.js"
import { NodeBase } from "./base.js"
import { Disjoint } from "./disjoint.js"
import { reduceBranches } from "./parse.js"
import type { ConstraintsInput } from "./predicate/parse.js"
import type { ConstraintKind } from "./predicate/predicate.js"
import { PredicateNode } from "./predicate/predicate.js"
import { ClassNode } from "./primitive/class.js"
import { arrayIndexTypeNode } from "./properties/indexed.js"
import { PropertiesNode } from "./properties/properties.js"
import { compileDiscriminant, compileIndiscriminable } from "./union/compile.js"
import { discriminate } from "./union/discriminate.js"
import { intersectBranches } from "./union/intersect.js"
import { builtins } from "./union/utils.js"

export type TypeRule = UnresolvedTypeNode | readonly PredicateNode[]

export type MaybeResolvedTypeNode = TypeNode | UnresolvedTypeNode

export type UnresolvedTypeNode = {
    alias: string
    resolve: Thunk<TypeNode>
}

export class TypeNode<t = unknown> extends NodeBase {
    declare [inferred]: t
    readonly kind = "type"

    constructor(
        public readonly branches: readonly PredicateNode[],
        public readonly meta: {}
    ) {
        super()
    }

    readonly references: readonly TypeNode[] = hasKey(this.branches, "resolve")
        ? // TODO: unresolved?
          []
        : this.branches.flatMap((predicate) => [...predicate.references])

    // TODO: to unit
    readonly unit =
        this.branches.length === 1 ? this.branches[0].unit : undefined

    // private cachedBranches: readonly PredicateNode[] | undefined
    // get branches() {
    //     if (!this.cachedBranches) {
    //         this.cachedBranches = hasKey(this.branches, "resolve")
    //             ? this.branches.resolve().branches
    //             : this.branches
    //     }
    //     return this.cachedBranches!
    // }

    compile(ctx: CompilationContext) {
        // if (hasKey(this.branches, "resolve")) {
        //     return `$${this.branches.alias}(${In})`
        // }
        const discriminant = discriminate(this.branches)
        return discriminant
            ? compileDiscriminant(discriminant, ctx)
            : compileIndiscriminable(this.branches, ctx)
    }

    describe() {
        return isArray(this.branches)
            ? this.branches.length === 0
                ? "never"
                : this.branches.map((branch) => branch.toString()).join(" or ")
            : this.branches.alias
    }

    intersect(other: TypeNode): TypeNode | Disjoint {
        if (this.branches.length === 1 && other.branches.length === 1) {
            const result = this.branches[0].intersect(other.branches[0])
            return result instanceof Disjoint
                ? result
                : new TypeNode([result], this.meta)
        }
        const resultBranches = intersectBranches(this.branches, other.branches)
        return resultBranches.length
            ? new TypeNode(resultBranches, this.meta)
            : Disjoint.from("union", this, other)
    }

    // discriminate is cached so we don't have to worry about this running multiple times
    get discriminant() {
        return discriminate(this.branches)
    }

    array(): TypeNode<t[]> {
        const props = new PropertiesNode(
            [{ key: arrayIndexTypeNode(), value: this }],
            this.meta
        )
        const predicate = new PredicateNode(
            {
                basis: new ClassNode(Array, this.meta),
                props
            },
            this.meta
        )
        return new TypeNode([predicate], this.meta)
    }

    isNever(): this is TypeNode<never> {
        return this.branches.length === 0
    }

    isUnknown(): this is TypeNode<unknown> {
        return (
            this.branches.length === 1 && this.branches[0].children.length === 0
        )
    }

    and<other>(other: TypeNode<other>) {
        const result = this.intersect(other as never)
        return result instanceof Disjoint
            ? result.throw()
            : (result as TypeNode<inferIntersection<t, other>>)
    }

    or<other>(other: TypeNode<other>) {
        return new TypeNode<t | other>(
            reduceBranches([...this.branches, ...other.branches]),
            this.meta
        )
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        definition: ConstraintsInput[kind]
    ): TypeNode<t> {
        return new TypeNode(
            this.branches.map((branch) => branch.constrain(kind, definition)),
            this.meta
        )
    }

    equals<other>(other: TypeNode<other>): this is TypeNode<other> {
        return false
    }

    extends<other>(other: TypeNode<other>): this is TypeNode<other> {
        // this.intersect(other as never) === this
        return false
    }

    keyof() {
        return this.branches.reduce(
            (result, branch) => result.and(branch.keyof()),
            builtins.unknown()
        ) as TypeNode<keyof t>
    }

    // TODO: TS implementation? test?
    getPath(...path: (string | TypeNode<string>)[]): TypeNode {
        let current: readonly PredicateNode[] = this.branches
        let next: PredicateNode[] = []
        while (path.length) {
            const key = path.shift()!
            for (const branch of current) {
                const propsAtKey = branch.properties
                if (propsAtKey) {
                    const branchesAtKey = propsAtKey.get(key)?.branches
                    if (branchesAtKey) {
                        next.push(...branchesAtKey)
                    }
                }
            }
            current = next
            next = []
        }
        return new TypeNode(current, this.meta)
    }
}

export const isUnresolvedNode = (
    node: MaybeResolvedTypeNode
): node is UnresolvedTypeNode => hasKey(node, "resolve")

export const maybeResolve = (node: MaybeResolvedTypeNode): TypeNode =>
    isUnresolvedNode(node) ? node.resolve() : node
