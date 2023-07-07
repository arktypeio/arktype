import type { Thunk } from "@arktype/utils"
import { hasKey, isArray } from "@arktype/utils"
import { In } from "../compiler/compile.js"
import { inferred } from "../parser/definition.js"
import type { inferIntersection } from "../parser/semantic/intersections.js"
import { NodeBase } from "./base.js"
import { Disjoint } from "./disjoint.js"
import type {
    ConstraintKind,
    PredicateInput,
    PredicateNode
} from "./predicate/predicate.js"
import { compileDiscriminant, compileIndiscriminable } from "./union/compile.js"
import { discriminate } from "./union/discriminate.js"
import { intersectBranches } from "./union/intersect.js"

export type TypeRule = UnresolvedTypeNode | readonly PredicateNode[]

export type MaybeResolvedTypeNode = TypeNode | UnresolvedTypeNode

export type UnresolvedTypeNode = {
    alias: string
    resolve: Thunk<TypeNode>
}

export class TypeNode<t = unknown> extends NodeBase<
    readonly PredicateNode[],
    {}
> {
    declare [inferred]: t
    readonly kind = "type"

    private cachedBranches: readonly PredicateNode[] | undefined
    get branches() {
        if (!this.cachedBranches) {
            this.cachedBranches = hasKey(this.rule, "resolve")
                ? this.rule.resolve().branches
                : this.rule
        }
        return this.cachedBranches!
    }

    compile() {
        if (hasKey(this.rule, "resolve")) {
            return `$${this.rule.alias}(${In})`
        }
        const discriminant = discriminate(this.rule)
        return discriminant
            ? compileDiscriminant(discriminant, ctx)
            : compileIndiscriminable(this.rule, ctx)
    }

    describe() {
        return isArray(this.rule)
            ? this.rule.length === 0
                ? "never"
                : this.rule.map((branch) => branch.toString()).join(" or ")
            : this.rule.alias
    }

    getReferences() {
        return hasKey(this.branches, "resolve")
            ? // TODO: unresolved?
              []
            : this.branches.flatMap((predicate) => [...predicate.references])
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

    get value() {
        return this.branches.length === 1 ? this.branches[0].value : undefined
    }

    array(): TypeNode<t[]> {
        const props = propsNode(
            [{ key: arrayIndexTypeNode(), value: this }],
            base.meta
        )
        const predicate = predicateNode(
            {
                basis: classNode(Array, base.meta),
                props
            },
            base.meta
        )
        return new TypeNode([predicate], base.meta)
    }

    isNever(): this is TypeNode<never> {
        return this.branches.length === 0
    }

    isUnknown(): this is TypeNode<unknown> {
        return this.branches.length === 1 && this.branches[0].rule.length === 0
    }

    and<other>(other: TypeNode<other>): TypeNode<inferIntersection<t, other>> {
        const result = this.intersect(other as never)
        return result instanceof Disjoint ? result.throw() : result
    }

    or<other>(other: TypeNode<other>): TypeNode<t | other> {
        if (this === (other as unknown)) {
            return this
        }
        return new TypeNode(
            reduceBranches([...this.branches, ...other.branches]),
            base.meta
        )
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        definition: PredicateInput[kind]
    ): TypeNode<t> {
        return new TypeNode(
            this.branches.map((branch) => branch.constrain(kind, def)),
            base.meta
        )
    }

    equals<other>(other: TypeNode<other>): this is TypeNode<other> {
        return this === other
    }

    extends<other>(other: TypeNode<other>): this is TypeNode<other> {
        // this.intersect(other as never) === this
        return false
    }

    keyof(): TypeNode<keyof t> {
        return this.branches.reduce(
            (result, branch) => result.and(branch.keyof()),
            builtins.unknown()
        )
    }

    getPath(...path: (string | TypeNode<string>)[]): TypeNode {
        let current: readonly PredicateNode[] = this.branches
        let next: PredicateNode[] = []
        while (path.length) {
            const key = path.shift()!
            for (const branch of current) {
                const propsAtKey = branch.getConstraints("props")
                if (propsAtKey) {
                    const branchesAtKey =
                        typeof key === "string"
                            ? propsAtKey.byName?.[key]?.value.branches
                            : propsAtKey.indexed.find(
                                  (entry) => entry.key === key
                              )?.value.branches
                    if (branchesAtKey) {
                        next.push(...branchesAtKey)
                    }
                }
            }
            current = next
            next = []
        }
        return new TypeNode(current, base.meta)
    }
}

export const isUnresolvedNode = (
    node: MaybeResolvedTypeNode
): node is UnresolvedTypeNode => hasKey(node, "resolve")

export const maybeResolve = (node: MaybeResolvedTypeNode): TypeNode =>
    isUnresolvedNode(node) ? node.resolve() : node
