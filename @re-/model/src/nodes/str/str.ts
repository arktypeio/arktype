import { writeJson } from "@re-/node"
import { Base } from "../base.js"
import { Alias } from "./alias.js"
import { Constraint } from "./constraint.js"
import { EmbeddedBigInt, EmbeddedNumber, EmbeddedRegex } from "./embedded.js"
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
              | EmbeddedRegex.Definition<infer Expression>
              | EmbeddedNumber.Definition
              | EmbeddedBigInt.Definition
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
        Def extends EmbeddedRegex.Definition<infer Expression>
        ? string
        : Def extends EmbeddedNumber.Definition<infer Value>
        ? Value
        : Def extends EmbeddedBigInt.Definition<infer Value>
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

    let cache: Record<string, Base.Node<unknown>> = {}

    export const resetCache = () => {
        cache = {}
    }

    process.on("exit", () => writeJson("cache.json", Object.keys(cache)))

    export const parse: Base.Parser<string> = (def, ctx) => {
        if (!(def in cache)) {
            if (Optional.matches(def)) {
                cache[def] = new Optional.Node(def, ctx)
            } else if (Keyword.matches(def)) {
                cache[def] = new Keyword.Node(def, ctx)
            } else if (Alias.matches(def, ctx)) {
                cache[def] = new Alias.Node(def, ctx)
            } else if (StringLiteral.matches(def)) {
                cache[def] = new StringLiteral.Node(def, ctx)
            } else if (EmbeddedRegex.matches(def)) {
                cache[def] = EmbeddedRegex.parse(def, ctx)
            } else if (EmbeddedNumber.matches(def)) {
                cache[def] = EmbeddedNumber.parse(def, ctx)
            } else if (EmbeddedBigInt.matches(def)) {
                cache[def] = EmbeddedBigInt.parse(def, ctx)
            } else if (Intersection.matches(def)) {
                cache[def] = new Intersection.Node(def, ctx)
            } else if (Union.matches(def)) {
                cache[def] = new Union.Node(def, ctx)
            } else if (List.matches(def)) {
                cache[def] = new List.Node(def, ctx)
            } else if (Constraint.matches(def)) {
                cache[def] = new Constraint.Node(def, ctx)
            } else {
                throw new Base.ParseError(
                    `Unable to determine the type of ${Base.stringifyDef(
                        def
                    )}${Base.stringifyPathContext(ctx.path)}.`
                )
            }
        }
        return cache[def]
    }
}
