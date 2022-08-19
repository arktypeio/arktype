import { RegexNode } from "../../../../obj/terminal/index.js"

export type RegexLiteralDefinition = `/${string}/`

export const regexLiteralToNode = (expression: RegexLiteralDefinition) =>
    new RegexNode(new RegExp(expression.slice(1, -1)))
