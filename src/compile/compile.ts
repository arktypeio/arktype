import type { Type } from "../main.ts"
import type { FlattenContext, Node, TypeNode } from "../nodes/node.ts"
import { isConfigNode } from "../nodes/node.ts"
import type { ParseContext } from "../parse/definition.ts"
import type { Domain } from "../utils/domains.ts"
import { objectKeysOf } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"

export type CompilationContext = ParseContext & {
    lastDomain: Domain
}

export const compileType = (type: Type) => {
    const ctx: CompilationContext = {
        type,
        path: new Path(),
        lastDomain: "undefined"
    }
    return compileNode(type.node, ctx)
}

export const compileNode = (node: Node, ctx: CompilationContext): string => {
    if (typeof node === "string") {
        return ctx.type.scope.resolve(node).js
    }
    const hasConfig = isConfigNode(node)
    const compiledTypeNode = compileTypeNode(hasConfig ? node.node : node, ctx)
    return typeof compiledTypeNode === "string" ? compiledTypeNode : "null"
    // hasConfig
    //     ? [
    //           [
    //               "config",
    //               {
    //                   config: entriesOf(node.config),
    //                   node: flattenedTypeNode
    //               }
    //           ]
    //       ]
    //     : flattenedTypeNode
}

export const compileTypeNode = (node: TypeNode, ctx: FlattenContext) => {
    const domains = objectKeysOf(node)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = node[domain]!
        if (predicate === true) {
            return `typeof data === '${domain}' ? data : state.problems.add("domain", "${domain}")`
        }
        ctx.lastDomain = domain
        // const flatPredicate = flattenPredicate(predicate, ctx)
        // return hasImpliedDomain(flatPredicate)
        //     ? flatPredicate
        //     : [["domain", domain], ...flatPredicate]
    }
    // const result: mutable<DomainsEntry[1]> = {}
    // for (const domain of domains) {
    //     ctx.lastDomain = domain
    //     result[domain] = flattenPredicate(node[domain]!, ctx)
    // }
    // return [["domains", result]]
}
