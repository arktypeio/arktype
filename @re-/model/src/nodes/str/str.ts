import { Alias } from "./alias.js"
import { Base, StrBase } from "./base.js"
import { Constraint } from "./constraint.js"
import { EmbeddedBigInt, EmbeddedNumber, EmbeddedRegex } from "./embedded.js"
import { Intersection } from "./intersection.js"
import { Keyword } from "./keyword.js"
import { List } from "./list.js"
import { Optional } from "./optional.js"
import { StringLiteral } from "./stringLiteral.js"
import { Union } from "./union.js"

type BinaryValidationResult<Left, Right> =
    Left extends Base.Parsing.ParseErrorMessage
        ? Left
        : Right extends Base.Parsing.ParseErrorMessage
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
        : Def extends Optional.Definition<infer Next>
        ? Optional.Validate<Next, Dict, Root>
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
        : Def extends List.Definition<infer Next>
        ? Validate<Next, Dict, Root>
        : Def extends Constraint.Definition
        ? Constraint.Validate<Def, Dict, Root>
        : Base.Parsing.ParseErrorMessage<
              Base.Parsing.UnknownTypeErrorMessage<Def>
          >

    export type References<
        Def extends string,
        Filter
    > = Def extends Optional.Definition<infer Next>
        ? RecursiveReferences<Next, Filter>
        : RecursiveReferences<Def, Filter>

    export type RecursiveReferences<Def extends string, Filter> = Def extends  // eslint-disable-next-line @typescript-eslint/no-unused-vars
        | StringLiteral.Definition<infer Text>
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        | EmbeddedRegex.Definition<infer Expression>
        ? Base.FilterToTuple<Def, Filter>
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? [
              ...RecursiveReferences<Left, Filter>,
              ...RecursiveReferences<Right, Filter>
          ]
        : Def extends Union.Definition<infer Left, infer Right>
        ? [
              ...RecursiveReferences<Left, Filter>,
              ...RecursiveReferences<Right, Filter>
          ]
        : Def extends List.Definition<infer Next>
        ? RecursiveReferences<Next, Filter>
        : Def extends Constraint.Definition
        ? Constraint.References<Def, Filter>
        : Base.FilterToTuple<Def, Filter>

    const splittableMatcher = StrBase.createSplittableMatcher("|&")

    export const references = (def: string): string[] => {
        const result = []
        // Union and intersection are the only types of string definitions that contain multiple references
        const parts = def.match(splittableMatcher)!
        for (let part of parts) {
            if (StringLiteral.matches(part) || EmbeddedRegex.matches(part)) {
                // These are the only two types that can contain non-alphanumeric characters within a reference
                result.push(part)
            } else {
                if (Constraint.matches(part)) {
                    // If the part is a constraint, extract the bounded reference before parsing any further
                    part = Constraint.getReference(part)
                }
                // At this point, removing all non-alphanumeric characters should yield remaining references to builtins or aliases
                result.push(part.replace(/[^a-z0-9]/gi, ""))
            }
        }
        return result
    }

    export type Parse<
        Def extends string,
        Dict,
        Seen
    > = Def extends Keyword.Definition
        ? Keyword.Types[Def]
        : Def extends keyof Dict
        ? Alias.Parse<Def, Dict, Seen>
        : Def extends Optional.Definition<infer Next>
        ? Parse<Next, Dict, Seen> | undefined
        : Def extends StringLiteral.Definition<infer Text>
        ? Text
        : // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Def extends EmbeddedRegex.Definition<infer Expression>
        ? string
        : Def extends EmbeddedNumber.Definition<infer Value extends number>
        ? Value
        : Def extends EmbeddedBigInt.Definition<infer Value extends bigint>
        ? Value
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? Str.Parse<Left, Dict, Seen> & Str.Parse<Right, Dict, Seen>
        : Def extends Union.Definition<infer Left, infer Right>
        ? Str.Parse<Left, Dict, Seen> | Str.Parse<Right, Dict, Seen>
        : Def extends List.Definition<infer Next>
        ? Parse<Next, Dict, Seen>[]
        : Def extends Constraint.Definition
        ? Constraint.Parse<Def, Dict, Seen>
        : unknown

    export const matches = (def: unknown): def is string =>
        typeof def === "string"

    export const parse: Base.Parsing.Parser<string> = (def, ctx) => {
        if (Optional.matches(def)) {
            return new Optional.Node(def, ctx)
        } else if (Keyword.matches(def)) {
            return new Keyword.Node(def, ctx)
        } else if (Alias.matches(def, ctx)) {
            return new Alias.Node(def, ctx)
        } else if (StringLiteral.matches(def)) {
            return new StringLiteral.Node(def, ctx)
        } else if (EmbeddedRegex.matches(def)) {
            return EmbeddedRegex.parse(def, ctx)
        } else if (EmbeddedNumber.matches(def)) {
            return EmbeddedNumber.parse(def, ctx)
        } else if (EmbeddedBigInt.matches(def)) {
            return EmbeddedBigInt.parse(def, ctx)
        } else if (Intersection.matches(def)) {
            return new Intersection.Node(def, ctx)
        } else if (Union.matches(def)) {
            return new Union.Node(def, ctx)
        } else if (List.matches(def)) {
            return new List.Node(def, ctx)
        } else if (Constraint.matches(def)) {
            return new Constraint.Node(def, ctx)
        }
        throw new Base.Parsing.ParseError(
            `Unable to determine the type of '${Base.stringifyDef(
                def
            )}'${Base.stringifyPathContext(ctx.path)}.`
        )
    }
}
