import type { Type } from "../main.ts"
import type { Branch } from "../nodes/branch.ts"
import { isTransformationBranch } from "../nodes/branch.ts"
import type { Node, TraversalKey, TypeNode } from "../nodes/node.ts"
import { isConfigNode } from "../nodes/node.ts"
import type { Predicate } from "../nodes/predicate.ts"
import type { ParseContext } from "../parse/definition.ts"
import type { Domain } from "../utils/domains.ts"
import { objectKeysOf } from "../utils/generics.ts"
import { isArray } from "../utils/objectKinds.ts"
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

export const compileTypeNode = (node: TypeNode, ctx: CompilationContext) => {
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

const compilePredicate = (
    predicate: Predicate,
    context: CompilationContext
) => {
    if (predicate === true) {
        return []
    }
    return isArray(predicate)
        ? flattenBranches(predicate, context)
        : flattenBranch(predicate, context)
}

const compileBranch = (branch: Branch, ctx: CompilationContext) => {
    if (isTransformationBranch(branch)) {
        const result = flattenRules(branch.rules, ctx)
        if (branch.morph) {
            if (typeof branch.morph === "function") {
                result.push(["morph", branch.morph])
            } else {
                for (const morph of branch.morph) {
                    result.push(["morph", morph])
                }
            }
        }
        return result
    }
    return compileRules(branch, ctx)
}

export const compileRules = (rules: UnknownRules, ctx: CompilationContext) => {
    let out = ""
    let k: keyof UnknownRules
    for (k in rules) {
        ruleCompilers[k](entries, rules[k] as any, ctx)
    }
    // // Some entries with the same precedence, e.g. morphs flattened from a list,
    // // rely on the fact that JS's builtin sort is stable to behave as expected
    // // when traversed:
    // // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    // return entries.sort((l, r) => precedenceMap[l[0]] - precedenceMap[r[0]])
}

type RuleCompiler<t> = (rule: t, ctx: CompilationContext) => void

type UnknownRules = NarrowableRules & Partial<LiteralRules>

const ruleCompilers: {
    [k in keyof UnknownRules]-?: RuleCompiler<UnknownRules[k] & {}>
} = {
    regex: (entries, rule) => {
        for (const source of listFrom(rule)) {
            entries.push(["regex", source])
        }
    },
    divisor: (entries, rule) => {
        entries.push(["divisor", rule])
    },
    range: flattenRange,
    class: (entries, rule) => {
        entries.push(["class", rule])
    },
    props: flattenProps,
    narrow: (entries, rule) => {
        for (const narrow of listFrom(rule)) {
            entries.push(["narrow", narrow])
        }
    },
    value: (entries, rule) => {
        entries.push(["value", rule])
    }
}

export const precedenceMap: {
    readonly [k in TraversalKey]: number
} = {
    // Config: Applies before any checks
    config: -1,
    // Critical: No other checks are performed if these fail
    domain: 0,
    value: 0,
    domains: 0,
    branches: 0,
    switch: 0,
    alias: 0,
    class: 0,
    // Shallow: All shallow checks will be performed even if one or more fail
    regex: 1,
    divisor: 1,
    bound: 1,
    // Prerequisite: These are deep checks with special priority, e.g. the
    // length of a tuple, which causes other deep props not to be checked if it
    // is invalid
    prerequisiteProp: 2,
    // Deep: Performed if all shallow checks pass, even if one or more deep checks fail
    distilledProps: 3,
    strictProps: 3,
    requiredProp: 3,
    optionalProp: 3,
    indexProp: 3,
    // Narrow: Only performed if all shallow and deep checks pass
    narrow: 4,
    // Morph: Only performed if all validation passes
    morph: 5
}
