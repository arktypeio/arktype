import type { Branch } from "../../nodes/branch.js"
import type { Predicate } from "../../nodes/predicate.js"
import { mappedKeys } from "../../nodes/rules/props.js"
import type { Rules } from "../../nodes/rules/rules.js"
import type { Domain } from "../../utils/domains.js"
import { throwInternalError } from "../../utils/errors.js"
import { deepFreeze } from "../../utils/freeze.js"
import type { constructor, evaluate, List } from "../../utils/generics.js"
import {
    listFrom,
    objectKeysOf,
    prototypeKeysOf
} from "../../utils/generics.js"
import {
    tryParseWellFormedInteger,
    wellFormedNonNegativeIntegerMatcher
} from "../../utils/numericLiterals.js"
import { defaultObjectKinds } from "../../utils/objectKinds.js"
import { stringify } from "../../utils/serialize.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import { writeImplicitNeverMessage } from "./intersection.js"
import type { PrefixParser } from "./tuple.js"

const arrayIndexStringBranch = deepFreeze({
    regex: wellFormedNonNegativeIntegerMatcher.source
}) satisfies Rules<"string">

const arrayIndexNumberBranch = deepFreeze({
    range: { min: { comparator: ">=", limit: 0 } },
    divisor: 1
}) satisfies Rules<"number">

type KeyDomain = "number" | "string" | "symbol"

type KeyNode = { [domain in KeyDomain]?: Rules<domain>[] }

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) => {
    const resolution = ctx.type.scope.resolveNode(parseDefinition(def[1], ctx))
    const predicateKeys = objectKeysOf(resolution).map((domain) =>
        keysOfPredicate(domain, resolution[domain]!)
    )
    const sharedKeys = sharedKeysOf(predicateKeys)

    if (!sharedKeys.length) {
        return writeImplicitNeverMessage(ctx.path, "keyof")
    }

    const keyNode: KeyNode = {}

    for (const key of sharedKeys) {
        const keyType = typeof key
        if (
            keyType === "string" ||
            keyType === "number" ||
            keyType === "symbol"
        ) {
            keyNode[keyType] ??= []
            keyNode[keyType]!.push({ value: key as any })
        } else if (key === wellFormedNonNegativeIntegerMatcher) {
            keyNode.string ??= []
            keyNode.string!.push(arrayIndexStringBranch)
            keyNode.number ??= []
            keyNode.number.push(arrayIndexNumberBranch)
        } else {
            return throwInternalError(
                `Unexpected keyof key '${stringify(key)}'`
            )
        }
    }

    return Object.fromEntries(
        Object.entries(keyNode).map(([domain, branches]) => [
            domain,
            branches.length === 1 ? branches[0] : branches
        ])
    )
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

const keysOfObjectBranch = (branch: Branch): KeyValue[] => {
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
    if ("class" in branch) {
        const constructor: constructor =
            typeof branch.class === "string"
                ? defaultObjectKinds[branch.class]
                : branch.class
        for (const key of prototypeKeysOf(constructor.prototype)) {
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
