import type { TypeNode } from "../main.js"
import type {
    ArrayIndexMatcherSource,
    IndexedPropRule
} from "../nodes/composite/indexed.js"
import {
    extractArrayIndexRegex,
    extractFirstVariadicIndex
} from "../nodes/composite/indexed.js"
import type { NamedPropRule } from "../nodes/composite/named.js"
import type { KeyRule } from "../nodes/composite/props.js"
import { builtins } from "../nodes/composite/type.js"
import type { NodeKind } from "../nodes/kinds.js"
import type { TypeConfig } from "../type.js"
import { type Domain, hasDomain } from "../utils/domains.js"
import { Path } from "../utils/lists.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import { registry } from "./registry.js"

export type CompilationContext = {
    path: KeyRule[]
    value: string
}

export const compile = (
    root: CompilationNode,
    ctx: CompilationContext = { path: [], value: In }
): string => {
    if (typeof root.children === "string") {
        return root.children.replaceAll(In, ctx.value)
    }
    if (root.children.length === 0) {
        // an empty set of conditions is never for a union (type),
        // or unknown for an intersection (predicate, props)
        return root.kind === "type" ? "false" : "true"
    }
    // const children: CompilationNode[][] = []
    // let lastPrecedence = -1
    // let current: CompilationNode[] = []
    // // TODO: unify with constraints by precedence
    // for (const child of root.children) {
    //     const currentPrecedence = precedenceByKind[child.kind]
    //     // if (currentPrecedence > lastPrecedence) {
    //     //     children.push(child.compilation)
    //     //     lastPrecedence = currentPrecedence
    //     // } else {
    //     //     children.at(-1)!.push(child.compilation)
    //     //}
    // }
    return ""
}

export const precedenceByKind = {
    // roots
    type: 0,
    predicate: 0,
    // basis checks
    domain: 1,
    class: 1,
    value: 1,
    // shallow checks
    range: 2,
    divisor: 2,
    regex: 2,
    // deep checks
    props: 3,
    // narrows
    narrow: 4,
    // morphs
    morph: 5
} as const satisfies Record<NodeKind, number>

// isTerminal(root)
//     ? root.condition.replaceAll(In, ctx.value)
//     : root.children.length === 0
//     ? root.operator === "&&"
//         ? "true"
//         : "false"
//     : root.children
//           .map((child) => {
//               if (!child.key) {
//                   return compile(child, ctx)
//               }
//               if (isNode(child.key)) {
//                   return "false"
//               }
//               const valueCondition = compile(child, {
//                   path: [...ctx.path, child.key],
//                   value: `${ctx.value}${compilePropAccess(child.key.name)}`
//               })
//               return child.key.optional
//                   ? `!('${child.key.name}' in ${ctx.value}) || ${valueCondition}`
//                   : valueCondition
//           })
//           .filter((condition) => condition !== "true")
//           .sort((l, r) => {})
//           .join(` ${root.operator} `)

export type CompilationNode = {
    key?: KeyRule
    kind: NodeKind
    children: CompilationNode[] | string
}

const compileNamedAndIndexedProps = (
    named: NamedPropRule[],
    indexed: IndexedPropRule[]
) => {
    if (indexed.length === 1) {
        // if the only unenumerable set of props are the indices of an array, we can iterate over it instead of checking each key
        const indexMatcher = extractArrayIndexRegex(indexed[0].key)
        if (indexMatcher) {
            return compileArray(indexMatcher, indexed[0].value, named)
        }
    }
    return compileNonArray(named, indexed)
}

const compileArray = (
    indexMatcher: ArrayIndexMatcherSource,
    elementNode: TypeNode,
    namedProps: NamedPropRule[]
) => {
    const firstVariadicIndex = extractFirstVariadicIndex(indexMatcher)
    // const namedCheck = compileNamedProps(namedProps)
    const elementCondition = elementNode.condition
        .replaceAll(IndexIn, `${IndexIn}Inner`)
        .replaceAll(In, `${In}[${IndexIn}]`)
    // TODO: don't recheck named
    // let valid = ${namedCheck};
    const result = `(() => {

    for(let ${IndexIn} = ${firstVariadicIndex}; ${IndexIn} < ${In}.length; ${IndexIn}++) {
        valid = ${elementCondition} && valid;
    }
    return valid
})()`
    return result
}

const compileNonArray = (
    namedProps: NamedPropRule[],
    indexedProps: IndexedPropRule[]
) => {
    // TODO: don't recheck named
    // const namedCheck = compileNamedProps(namedProps)
    const indexedChecks = indexedProps.map(compileIndexedProp).join("\n")

    return `(() => {
    for(const ${KeyIn} in ${In}) {
        ${indexedChecks}
    }
    return valid
})()`
}

const compileIndexedProp = (prop: IndexedPropRule) => {
    const valueCheck = `valid = ${prop.value.condition
        .replaceAll(KeyIn, `${KeyIn}Inner`)
        .replaceAll(In, `${In}[${KeyIn}]`)} && valid`
    if (prop.key === builtins.string()) {
        // if the index signature is just for "string", we don't need to check it explicitly
        return valueCheck
    }
    return `if(${prop.key.condition
        .replaceAll(KeyIn, `${KeyIn}Inner`)
        .replaceAll(In, KeyIn)}) {
        ${valueCheck}
    }`
}

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}

const initializeCompilationConfig = (): TraversalConfig => ({
    mustBe: [],
    keys: []
})

export const In = "$arkRoot"

export const IndexIn = "$arkIndex"

export const KeyIn = "$arkKey"

export const prependIndex = (path: string) =>
    `${In}[${IndexIn}]${path.slice(In.length)}`

export type CompilePathAccessOptions = {
    root?: string
    optional?: boolean
}

export const compilePathAccess = (
    segments: string[],
    opts?: CompilePathAccessOptions
) => {
    let result = opts?.root ?? In
    for (const segment of segments) {
        result += compilePropAccess(segment, opts?.optional)
    }
    return result
}

export const compilePropAccess = (key: string, optional = false) => {
    return /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(key)
        ? `${optional ? "?" : ""}.${key}`
        : `${optional ? "?." : ""}[${JSON.stringify(key)}]`
}

export const compileSerializedValue = (value: unknown) => {
    return hasDomain(value, "object") || typeof value === "symbol"
        ? registry().register(typeof value, value)
        : serializePrimitive(value as SerializablePrimitive)
}

export class CompilationState {
    path = new Path()
    lastkind: Domain = "undefined"
    unionDepth = 0
    traversalConfig = initializeCompilationConfig()

    constructor() {}

    get data() {
        return compilePathAccess(this.path)
    }

    problem<code extends ProblemCode>(code: code, rule: ProblemRules[code]) {
        return `${
            this.unionDepth ? "return " : ""
        }state.addProblem("${code}", ${
            typeof rule === "function"
                ? rule.name
                : // TODO: Fix
                  compileSerializedValue(rule)
        }, ${this.data}, ${this.path.json})` as const
    }

    ifThen<condition extends string, onTrue extends string>(
        condition: condition,
        onTrue: onTrue
    ) {
        return `if (${condition}) {
            ${onTrue}
        }`
    }

    ifNotThen<condition extends string, onFalse extends string>(
        condition: condition,
        onFalse: onFalse
    ) {
        return `if (!(${condition})) {
            ${onFalse}
        }`
    }
}
