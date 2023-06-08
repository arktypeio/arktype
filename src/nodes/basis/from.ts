import type { Domain } from "../../utils/domains.js"
import { domainOf } from "../../utils/domains.js"
import { throwInternalError } from "../../utils/errors.js"
import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import type { BasisInput } from "./basis.js"
import { ClassNode } from "./class.js"
import { DomainNode } from "./domain.js"
import { ValueNode } from "./value.js"

export type basisNodeFrom<input extends BasisInput> = input extends Domain
    ? DomainNode
    : input extends AbstractableConstructor
    ? ClassNode
    : ValueNode

export const basisNodeFrom = ((input) => {
    switch (typeof input) {
        case "string":
            return DomainNode(input)
        case "object":
            return ValueNode(input[1])
        case "function":
            return ClassNode(input)
        default:
            throwInternalError(
                `Unexpectedly got a basis input of type ${domainOf(input)}`
            )
    }
}) as <input extends BasisInput>(input: input) => basisNodeFrom<input>
