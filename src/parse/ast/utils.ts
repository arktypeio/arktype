import type { List, Literalable } from "../../utils/generics.js"
import type { Scanner } from "../string/shift/scanner.js"
import type { InfixExpression, PostfixExpression } from "./ast.js"

export type astToString<ast> = `'${astToStringRecurse<ast>}'`;
    
type astToStringRecurse<ast> = 
    ast extends PostfixExpression<infer operator, infer operand>
        ? operator extends "[]"
            ? `${groupAst<operand>}[]`
            : never
    : ast extends InfixExpression<infer operator, infer l, infer r>
        ? operator extends "&" | "|" | "%" | Scanner.Comparator
            ? `${groupAst<l>}${operator}${groupAst<r>}`
            : never
    : ast extends Literalable
        ? `${ast extends bigint ? `${ast}n` : ast}`
        : "..."


type groupAst<ast> = ast extends List 
    ? ast[1] extends "[]" 
        ? astToStringRecurse<ast> 
        : `(${astToStringRecurse<ast>})` 
    : astToStringRecurse<ast>