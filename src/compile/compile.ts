import { TypeNode } from "../main.js"
import type {
    ArrayIndexMatcherSource,
    IndexedPropRule
} from "../nodes/constraints/props/indexed.js"
import {
    extractArrayIndexRegex,
    extractFirstVariadicIndex
} from "../nodes/constraints/props/indexed.js"
import type { NamedPropRule } from "../nodes/constraints/props/named.js"
import type { TypeConfig } from "../type.js"
import { type Domain, hasDomain } from "../utils/domains.js"
import { Path } from "../utils/lists.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import { registry } from "./registry.js"

export const compile = (root: CompilationNode): string =>
    typeof root === "string"
        ? root
        : root.children.length === 0
        ? root.operator === "&"
            ? "true"
            : "false"
        : root.children
              .flatMap((group) =>
                  // sort only within groups to preserve precedence while
                  // guaranteeing equivalent types compile to the same string
                  typeof group === "string" ? group : group.map(compile).sort()
              )
              .join(` ${root.operator} `)

export type CompilationNode = string | NonTerminalCompilationNode

type NonTerminalCompilationNode = {
    key?: string
    operator: "&" | "|"
    children: CompilationNode[][]
}

export const compileNamedProps = (props: NamedPropRule[]) =>
    props.map(compileNamedProp).join(" && ") || "true"

const compileNamedProp = (prop: NamedPropRule) => {
    const valueCheck = prop.value.condition.replaceAll(
        In,
        `${In}${compilePropAccess(prop.key)}`
    )
    return prop.optional
        ? `!('${prop.key}' in ${In}) || ${valueCheck}`
        : valueCheck
}

export const compileNamedAndIndexedProps = (
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
    const namedCheck = compileNamedProps(namedProps)
    const elementCondition = elementNode.condition
        .replaceAll(IndexIn, `${IndexIn}Inner`)
        .replaceAll(In, `${In}[${IndexIn}]`)
    // TODO: don't recheck named
    const result = `(() => {
    let valid = ${namedCheck};
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
    const namedCheck = compileNamedProps(namedProps)
    const indexedChecks = indexedProps.map(compileIndexedProp).join("\n")
    // TODO: don't recheck named
    return `(() => {
    let valid = ${namedCheck};
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
    if (prop.key === TypeNode.string) {
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
