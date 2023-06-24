import type { evaluate } from "../../dev/utils/src/main.js"
import { CompiledFunction, deepFreeze } from "../../dev/utils/src/main.js"
import { arkKind } from "../compile/registry.js"
import { CompilationState, InputParameterName } from "../compile/state.js"
import type { inferred } from "../parse/definition.js"
import type { NodeEntry } from "./composite/props.js"
import { Disjoint } from "./disjoint.js"
import type { NodeKind, NodeKinds } from "./kinds.js"
import type { BasisKind } from "./primitive/basis/basis.js"

type BaseNodeImplementation<node extends BaseNode, parsableFrom> = {
    kind: node["kind"]
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (rule: node["rule"] | parsableFrom) => node["rule"]
    compile: (rule: node["rule"], s: CompilationState) => string
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
}

export type NodeChildren = BaseNode[] | NodeEntry[]

type NodeExtension<node extends BaseNode> = (
    base: basePropsOf<node>
) => extendedPropsOf<node>

type basePropsOf<node extends BaseNode> = Pick<node, BuiltinBaseKey>

type extendedPropsOf<node extends BaseNode> = Omit<
    node,
    // we don't actually need the inferred symbol at runtime
    BuiltinBaseKey | typeof inferred
> &
    ThisType<node>

interface PreconstructedBase<rule, intersectsWith> {
    [arkKind]: "node"
    kind: NodeKind
    rule: rule
    compile(state: CompilationState): string
    condition: string
    intersect(other: intersectsWith | this): intersectsWith | this | Disjoint
    // TODO: can this work as is with late resolution?
    allows(data: unknown): boolean
    hasKind<kind extends NodeKind>(kind: kind): this is NodeKinds[kind]
    isBasis(): this is NodeKinds[BasisKind]
}

type BuiltinBaseKey = evaluate<keyof PreconstructedBase<any, any>>

export type BaseNodeExtensionProps = {
    description: string
}

export type BaseNode<
    rule = unknown,
    intersectsWith = never
> = PreconstructedBase<rule, intersectsWith> & BaseNodeExtensionProps

type IntersectionCache<node extends BaseNode = BaseNode> = {
    [lCondition: string]: {
        [rCondition: string]: ReturnType<node["intersect"]>
    }
}

export type NodeConstructor<node extends BaseNode, input> = (
    input: node["rule"] | input
) => node

export const alphabetizeByCondition = <nodes extends BaseNode[]>(
    nodes: nodes
) => nodes.sort((l, r) => (l.condition > r.condition ? 1 : -1))

export const defineNodeKind = <
    node extends BaseNode<any, any>,
    parsableFrom = never
>(
    def: BaseNodeImplementation<node, parsableFrom>,
    addProps: NodeExtension<node>
): NodeConstructor<node, parsableFrom> => {
    const nodeCache: {
        [condition: string]: node | undefined
    } = {}
    const intersectionCache: IntersectionCache = {}
    return (input) => {
        // TODO: find a better way to make it obvious if things get misaligned
        const rule = def.parse(input)
        const condition = def.compile(rule, new CompilationState("allows"))
        if (nodeCache[condition]) {
            return nodeCache[condition]!
        }
        intersectionCache[condition] = {}
        const isBasis =
            def.kind === "domain" ||
            def.kind === "class" ||
            def.kind === "value"
        const base: PreconstructedBase<node["rule"], never> = {
            [arkKind]: "node",
            kind: def.kind,
            hasKind: (kind) => kind === def.kind,
            isBasis: () => isBasis,
            condition,
            rule,
            compile: (state: CompilationState) => def.compile(rule, state),
            allows: new CompiledFunction(
                InputParameterName,
                `${condition}
            return true`
            ),
            intersect: (other) => {
                if (instance === other) {
                    return instance
                }
                if (intersectionCache[condition][other.condition]) {
                    return intersectionCache[condition][other.condition]!
                }
                const result: BaseNode | Disjoint = def.intersect(
                    instance,
                    other
                )
                intersectionCache[condition][other.condition] = result
                intersectionCache[other.condition][condition] =
                    // also cache the result with other's condition as the key.
                    // if it was a Disjoint, it has to be inverted so that l,r
                    // still line up correctly
                    result instanceof Disjoint ? result.invert() : result
                return result
            }
        }
        const instance = deepFreeze(
            Object.assign(addProps(base as node), base, {
                toString: () => instance.description
            })
        ) as node
        nodeCache[condition] = instance
        return instance
    }
}
