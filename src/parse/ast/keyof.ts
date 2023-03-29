import { BranchNode, ValueNode } from "../../nodes/branch.ts"
import type { Domain, domainOf } from "../../utils/domains.ts"
import { throwInternalError } from "../../utils/errors.ts"
import type { evaluate, List } from "../../utils/generics.ts"
import { keysOf, listFrom, prototypeKeysOf } from "../../utils/generics.ts"
import {
    tryParseWellFormedInteger,
    wellFormedNonNegativeIntegerMatcher
} from "../../utils/numericLiterals.ts"
import { stringify } from "../../utils/serialize.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import { writeImplicitNeverMessage } from "./intersection.ts"
import type { PrefixParser } from "./tuple.ts"

const arrayIndexStringBranch = new BranchNode({
    domain: "string",
    // TODO: non array input
    regex: [wellFormedNonNegativeIntegerMatcher.source]
})

const arrayIndexNumberBranch = new BranchNode({
    domain: "number",
    // TODO: non array input
    range: {
        ">=": 0
    },
    divisor: 1
})

type KeyType = number | string | symbol

type KeyDomain = domainOf<KeyType>

type KeyBranch = { [domain in KeyDomain]: BranchNode<domain> }[KeyDomain]

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) => {
    const resolution = ctx.type.scope.resolveNode(parseDefinition(def[1], ctx))
    const predicateKeys = keysOf(resolution).map((domain) =>
        keysOfPredicate(domain, resolution[domain]!)
    )
    const sharedKeys = sharedKeysOf(predicateKeys)

    if (!sharedKeys.length) {
        return writeImplicitNeverMessage(ctx.path, "keyof")
    }

    const keyBranches: KeyBranch[] = []

    for (const key of sharedKeys) {
        const keyType = typeof key
        if (
            keyType === "string" ||
            keyType === "number" ||
            keyType === "symbol"
        ) {
            keyBranches.push(new ValueNode(key) as KeyBranch)
        } else if (key === wellFormedNonNegativeIntegerMatcher) {
            keyBranches.push(arrayIndexStringBranch, arrayIndexNumberBranch)
        } else {
            return throwInternalError(
                `Unexpected keyof key '${stringify(key)}'`
            )
        }
    }

    return new TypeNode(keyBranches)
}

type KeyValue = string | number | symbol | RegExp

const baseKeysByDomain: Record<Domain, readonly KeyValue[]> = {
    bigint: prototypeKeysOf(0n),
    boolean: prototypeKeysOf(false),
    null: [],
    number: prototypeKeysOf(0),
    // TS doesn't include the Object prototype in keyof, so keyof object is never
    object: [],
    string: prototypeKeysOf(""),
    symbol: prototypeKeysOf(Symbol()),
    undefined: []
}

const keysOfPredicate = (domain: Domain, predicate: Predicate) =>
    domain !== "object" || predicate === true
        ? baseKeysByDomain[domain]
        : sharedKeysOf(
              listFrom(predicate).map((branch) => keysOfObjectBranch(branch))
          )

const sharedKeysOf = (keyBranches: List<KeyValue>[]): List<KeyValue> => {
    if (!keyBranches.length) {
        return []
    }
    let sharedKeys = keyBranches[0]
    for (let i = 1; i < keyBranches.length; i++) {
        // we can filter directly by equality here because the RegExp we're
        // using will always be reference equal to
        // wellFormedNonNegativeIntegerMatcher
        sharedKeys = sharedKeys.filter((k) => keyBranches[i].includes(k))
    }
    return sharedKeys
}

const keysOfObjectBranch = (branch: BranchNode<"object">): KeyValue[] => {
    const result: KeyValue[] = []
    if ("props" in branch) {
        for (const key of Object.keys(branch.props)) {
            if (key === mappedKeys.index) {
                // if any number is a valid key push this RegExp
                result.push(wellFormedNonNegativeIntegerMatcher)
            } else if (!result.includes(key)) {
                result.push(key)
                if (wellFormedNonNegativeIntegerMatcher.test(key)) {
                    // allow numeric access to keys
                    result.push(
                        tryParseWellFormedInteger(
                            key,
                            `Unexpectedly failed to parse an integer from key '${key}'`
                        )
                    )
                }
            }
        }
    }
    if ("instance" in branch) {
        for (const key of prototypeKeysOf(branch.instance.prototype)) {
            if (!result.includes(key)) {
                result.push(key)
            }
        }
    }
    return result
}

export type inferKeyOfExpression<operandDef, $> = evaluate<
    keyof inferDefinition<operandDef, $>
>

export type validateKeyOfExpression<operandDef, $> = readonly [
    "keyof",
    inferKeyOfExpression<operandDef, $> extends never
        ? writeImplicitNeverMessage<[], "keyof">
        : validateDefinition<operandDef, $>
]
