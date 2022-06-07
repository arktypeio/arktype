import { asNumber } from "@re-/tools"
import { Base } from "../base.js"
import { Literal } from "../index.js"
import { Regex } from "../obj/regex.js"
import { Alias } from "./alias.js"
import { Constraint } from "./constraint.js"
import { Intersection } from "./intersection.js"
import { Keyword } from "./keyword.js"
import { List } from "./list.js"
import { Optional } from "./optional.js"
import { StringLiteral } from "./stringLiteral.js"
import { Union } from "./union.js"

type BinaryValidationResult<Left, Right> = Left extends Base.ParseErrorMessage
    ? Left
    : Right extends Base.ParseErrorMessage
    ? Right
    : Left

type BinaryValidate<
    Left extends string,
    Right extends string,
    Dict,
    Root
> = BinaryValidationResult<
    Str.Validate<Left, Dict, Root>,
    Str.Validate<Right, Dict, Root>
>

type EmbeddedRegexDefinition<Expression extends string> =
    Expression extends `${string}/${string}` ? never : `/${Expression}/`

// Matches a definition enclosed by forward slashes that does not contain any other forward slashes
const embeddedRegexMatcher = /^\/[^/]*\/$/

type EmbeddedNumberDefinition<Value extends number = number> = `${Value}`

// Matches a well-formatted numeric expression
const embeddedNumberMatcher = /^-?(0|[1-9]\d*)(\.\d+)?$/

type EmbeddedBigintDefinition<Value extends bigint = bigint> = `${Value}n`

// Matches a well-formatted integer expression followed by "n"
const embeddedBigIntMatcher = /^-?(0|[1-9]\d*)n$/

export namespace Str {
    export type Validate<Def extends string, Dict, Root> = Def extends
        | Keyword.Definition
        | keyof Dict
        | "cyclic"
        | "resolution"
        ? Root
        : Def extends Optional.Definition<infer Child>
        ? Optional.Validate<Child, Dict, Root>
        : Def extends  // eslint-disable-next-line @typescript-eslint/no-unused-vars
              | StringLiteral.Definition<infer Text>
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              | EmbeddedRegexDefinition<infer Expression>
              | EmbeddedNumberDefinition
              | EmbeddedBigintDefinition
        ? Root
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? BinaryValidate<Left, Right, Dict, Root>
        : Def extends Union.Definition<infer Left, infer Right>
        ? BinaryValidate<Left, Right, Dict, Root>
        : Def extends List.Definition<infer Child>
        ? Validate<Child, Dict, Root>
        : Def extends Constraint.Definition
        ? Constraint.Validate<Def, Dict, Root>
        : Base.ParseErrorMessage<Base.UnknownTypeError<Def>>

    export type Parse<
        Def extends string,
        Dict,
        Seen
    > = Def extends Keyword.Definition
        ? Keyword.Types[Def]
        : Def extends keyof Dict
        ? Alias.Parse<Def, Dict, Seen>
        : Def extends Optional.Definition<infer Child>
        ? Parse<Child, Dict, Seen> | undefined
        : Def extends StringLiteral.Definition<infer Text>
        ? Text
        : // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Def extends EmbeddedRegexDefinition<infer Expression>
        ? string
        : Def extends EmbeddedNumberDefinition<infer Value>
        ? Value
        : Def extends EmbeddedBigintDefinition<infer Value>
        ? Value
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? Str.Parse<Left, Dict, Seen> & Str.Parse<Right, Dict, Seen>
        : Def extends Union.Definition<infer Left, infer Right>
        ? Str.Parse<Left, Dict, Seen> | Str.Parse<Right, Dict, Seen>
        : Def extends List.Definition<infer Child>
        ? Parse<Child, Dict, Seen>[]
        : Def extends Constraint.Definition
        ? Constraint.Parse<Def, Dict, Seen>
        : unknown

    export const matches = (def: unknown): def is string =>
        typeof def === "string"

    export const parse: Base.Parser<string> = (def, ctx) => {
        if (Optional.matches(def)) {
            return new Optional.Node(def, ctx)
        } else if (Keyword.matches(def)) {
            return new Keyword.Node(def, ctx)
        } else if (Alias.matches(def, ctx)) {
            return new Alias.Node(def, ctx)
        } else if (StringLiteral.matches(def)) {
            return new StringLiteral.Node(def, ctx)
        } else if (embeddedRegexMatcher.test(def)) {
            return new Regex.Node(new RegExp(def.slice(1, -1)), ctx)
        } else if (embeddedNumberMatcher.test(def)) {
            return new Literal.Node(asNumber(def, { assert: true }), ctx)
        } else if (embeddedBigIntMatcher.test(def)) {
            return new Literal.Node(
                BigInt(asNumber(def.slice(0, -1), { assert: true })),
                ctx
            )
        } else if (Intersection.matches(def)) {
            return new Intersection.Node(def, ctx)
        } else if (Union.matches(def)) {
            return new Union.Node(def, ctx)
        } else if (List.matches(def)) {
            return new List.Node(def, ctx)
        }
        throw new Base.ParseError(
            `Unable to determine the type of ${Base.stringifyDef(
                def
            )}${Base.stringifyPathContext(ctx.path)}.`
        )
    }
}
