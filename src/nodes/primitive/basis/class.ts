import type { AbstractableConstructor } from "../../../../dev/utils/src/main.js"
import {
    cached,
    constructorExtends,
    getExactBuiltinConstructorName,
    objectKindDescriptions,
    prototypeKeysOf
} from "../../../../dev/utils/src/main.js"
import { compileCheck, InputParameterName } from "../../../compile/compile.js"
import { registry } from "../../../compile/registry.js"
import { node } from "../../../main.js"
import { defineNodeKind } from "../../node.js"
import type { Constraint } from "../primitive.js"
import type { BaseBasis } from "./basis.js"
import { intersectBases } from "./basis.js"

export type ClassConstraint = Constraint<"class", AbstractableConstructor, {}>

export interface ClassNode extends BaseBasis<ClassConstraint> {
    extendsOneOf: (...baseConstructors: AbstractableConstructor[]) => boolean
}

export const classNode = defineNodeKind<ClassNode>(
    {
        kind: "class",
        parse: (input) => input,
        compile: (rule) =>
            `${InputParameterName} instanceof ${
                getExactBuiltinConstructorName(rule) ??
                registry().register(rule)
            }`,
        intersect: intersectBases
    },
    (base) => {
        const literalKeys = prototypeKeysOf(base.children.prototype)
        const possibleObjectKind = getExactBuiltinConstructorName(base.children)
        const description = possibleObjectKind
            ? objectKindDescriptions[possibleObjectKind]
            : `an instance of ${base.children.name}`
        return {
            domain: "object",
            literalKeys,
            keyof: cached(() => node.literal(...literalKeys)),
            extendsOneOf: (...baseConstructors: AbstractableConstructor[]) =>
                baseConstructors.some((ctor) =>
                    constructorExtends(base.children, ctor)
                ),
            description
        }
    }
)

export const arrayClassNode = cached(() => classNode(Array))
