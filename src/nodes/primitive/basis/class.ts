import type { AbstractableConstructor } from "@arktype/utils"
import {
    cached,
    constructorExtends,
    getExactBuiltinConstructorName,
    objectKindDescriptions,
    prototypeKeysOf
} from "@arktype/utils"
import { InputParameterName } from "../../../compile/compile.js"
import { registry } from "../../../compile/registry.js"
import { node } from "../../../main.js"
import type { BaseNodeMeta } from "../../node.js"
import { defineNode } from "../../node.js"
import type { BasisNode, defineBasis } from "./basis.js"

export interface ClassMeta extends BaseNodeMeta {}

export type ClassConfig = defineBasis<{
    kind: "class"
    rule: AbstractableConstructor
    meta: ClassMeta
}>

export interface ClassNode extends BasisNode<ClassConfig> {
    extendsOneOf: (...baseConstructors: AbstractableConstructor[]) => boolean
}

export const classNode = defineNode<ClassNode>(
    {
        kind: "class",
        compile: (rule) =>
            `${InputParameterName} instanceof ${
                getExactBuiltinConstructorName(rule) ??
                registry().register(rule)
            }`
    },
    (base) => {
        const literalKeys = prototypeKeysOf(base.rule.prototype)
        const possibleObjectKind = getExactBuiltinConstructorName(base.rule)
        const description = possibleObjectKind
            ? objectKindDescriptions[possibleObjectKind]
            : `an instance of ${base.rule.name}`
        return {
            domain: "object",
            literalKeys,
            keyof: cached(() => node.literal(...literalKeys)),
            extendsOneOf: (...baseConstructors: AbstractableConstructor[]) =>
                baseConstructors.some((ctor) =>
                    constructorExtends(base.rule, ctor)
                ),
            description
        }
    }
)
