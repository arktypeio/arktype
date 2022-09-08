import { alphaNumericRegex, alphaOnlyRegex } from "@re-/tools"
import { regexConstraint } from "../../../constraints/regex.js"
import { anyNode } from "./any.js"
import { bigintNode } from "./bigint.js"
import { booleanNode } from "./boolean.js"
import { functionNode } from "./function.js"
import { neverNode } from "./never.js"
import { nullNode } from "./null.js"
import { numberNode } from "./number.js"
import { objectNode } from "./object.js"
import { stringNode } from "./string.js"
import { symbolNode } from "./symbol.js"
import { undefinedNode } from "./undefined.js"
import { unknownNode } from "./unknown.js"
import { voidNode } from "./void.js"

export namespace Keyword {
    export type Definition = keyof KeywordsToNodes

    export type Types = {
        [K in Definition]: GetGeneratedType<KeywordsToNodes[K]>
    }

    export const nodes = {
        any: new anyNode(),
        bigint: new bigintNode(),
        boolean: new booleanNode(),
        function: new functionNode(),
        never: new neverNode(),
        null: new nullNode(),
        object: new objectNode(),
        symbol: new symbolNode(),
        undefined: new undefinedNode(),
        unknown: new unknownNode(),
        void: new voidNode(),
        string: new stringNode(),
        number: new numberNode(),
        // String subtypes
        email: new stringNode(
            new regexConstraint(
                "email",
                /^(.+)@(.+)\.(.+)$/,
                "be a valid email"
            )
        ),
        alpha: new stringNode(
            new regexConstraint("alpha", alphaOnlyRegex, "include only letters")
        ),
        alphanumeric: new stringNode(
            new regexConstraint(
                "alphanumeric",
                alphaNumericRegex,
                "include only letters and numbers"
            )
        ),
        lower: new stringNode(
            new regexConstraint(
                "lower",
                /^[a-z]*$/,
                "include only lowercase letters"
            )
        ),
        upper: new stringNode(
            new regexConstraint(
                "upper",
                /^[A-Z]*$/,
                "include only uppercase letters"
            )
        )
        // number subtypes
    }

    export const matches = (def: string): def is Definition => def in nodes

    export const parse = (def: Definition) => nodes[def]

    type KeywordsToNodes = typeof nodes

    type KeywordNode = KeywordsToNodes[keyof KeywordsToNodes]

    type GetGeneratedType<N extends KeywordNode> = ReturnType<N["create"]>
}
