import { RegexNode } from "../../obj/regex.js"

export type RegexLiteralDefinition = `/${string}/`

export const regexLiteralToNode = (expression: string) =>
    new RegexNode(new RegExp(expression))
