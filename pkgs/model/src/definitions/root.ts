import {
    typeDefProxy,
    Precedence,
    BadDefinitionType,
    DefinitionTypeError,
    definitionTypeError,
    UnknownTypeError,
    ErrorNode,
    DefaultParseTypeContext,
    ValueOf
} from "./internal.js"
import { Obj, Map, Tuple } from "./obj/index.js"
import {
    ArrowFunction,
    Union,
    Intersection,
    Constraint,
    List,
    Str,
    Optional,
    Alias
} from "./str/index.js"
import { Literal } from "./literal/index.js"
import { reroot, createParser } from "./parser.js"
import { Evaluate, Get, ListPossibleTypes } from "@re-/tools"
import { ErrorNodeKind, ValidationErrorMessage } from "../errors.js"

export namespace Root {
    export type Parse<Def, Resolutions, Context> = Def extends BadDefinitionType
        ? ErrorNode<DefinitionTypeError>
        : Precedence<
              [
                  Obj.Parse<Def, Resolutions, Context>,
                  Literal.Parse<Def>,
                  Str.ParseRoot<Def, Resolutions, Context>,
                  ErrorNode<
                      UnknownTypeError<
                          Def extends string ? Def : "your definition"
                      >
                  >
              ]
          >

    export type TypeOf<
        N,
        Nodes,
        Options,
        Kind = Get<N, "kind">
    > = "type" extends keyof N
        ? N["type"]
        : Kind extends Alias.Kind
        ? Alias.TypeOf<N, Nodes, Options>
        : Kind extends Tuple.Kind
        ? Tuple.TypeOf<N, Nodes, Options>
        : Kind extends Map.Kind
        ? Map.TypeOf<N, Nodes, Options>
        : Kind extends Optional.Kind
        ? Evaluate<Optional.TypeOf<N, Nodes, Options>>
        : Kind extends ArrowFunction.Kind
        ? Evaluate<ArrowFunction.TypeOf<N, Nodes, Options>>
        : Kind extends Union.Kind
        ? Evaluate<Union.TypeOf<N, Nodes, Options>>
        : Kind extends Intersection.Kind
        ? Intersection.TypeOf<N, Nodes, Options>
        : Kind extends Constraint.Kind
        ? Evaluate<Constraint.TypeOf<N, Nodes, Options>>
        : Kind extends List.Kind
        ? Evaluate<List.TypeOf<N, Nodes, Options>>
        : unknown

    // export type TypeOf<
    //     N,
    //     Resolutions,
    //     Options,
    //     Kind = Get<N, "kind">
    // > = "type" extends keyof N
    //     ? N["type"]
    //     : Kind extends Tuple.Kind
    //     ? Tuple.TypeOf<N, Resolutions, Options>
    //     : Kind extends Map.Kind
    //     ? Map.TypeOf<N, Resolutions, Options>
    //     : Kind extends Optional.Kind
    //     ? Evaluate<Optional.TypeOf<N, Resolutions, Options>>
    //     : Kind extends ArrowFunction.Kind
    //     ? Evaluate<ArrowFunction.TypeOf<N, Resolutions, Options>>
    //     : Kind extends Union.Kind
    //     ? Evaluate<Union.TypeOf<N, Resolutions, Options>>
    //     : Kind extends Intersection.Kind
    //     ? Intersection.TypeOf<N, Resolutions, Options>
    //     : Kind extends Constraint.Kind
    //     ? Evaluate<Constraint.TypeOf<N, Resolutions, Options>>
    //     : Kind extends List.Kind
    //     ? Evaluate<List.TypeOf<N, Resolutions, Options>>
    //     : unknown

    export type Validate<
        N,
        Kind = Get<N, "kind">,
        Children = Get<N, "children">
    > = Kind extends Tuple.Kind | Map.Kind
        ? { [K in keyof Children]: Validate<Children[K]> }
        : ValidateShallow<N>

    export type ValidateShallow<
        N,
        Errors = ListPossibleTypes<
            Extract<FlattenReferences<N>, ValidationErrorMessage>
        >
    > = Errors extends [] ? Get<N, "def"> : { errors: Errors }

    export type ReferencesOf<
        N,
        Options,
        Kind = Get<N, "kind">,
        Children = Get<N, "children">
    > = Kind extends Tuple.Kind | Map.Kind
        ? { [K in keyof Children]: ReferencesOf<Children[K], Options> }
        : FlattenReferences<N>

    // export type FlatReferencesOf<
    //     N,
    //     Config,
    //     Reference = FlattenReferences<N>
    // > = Get<Config, "asTuple"> extends true
    //     ? ListPossibleTypes<Reference>
    //     : Get<Config, "asList"> extends true
    //     ? Reference[]
    //     : Reference

    export type FlattenReferences<
        N,
        Children = Get<N, "children">
    > = Children extends any[]
        ? FlattenReferences<Children[number]>
        : Children extends object
        ? FlattenReferences<Children[keyof Children]>
        : Get<N, "def">

    export const type = typeDefProxy as any

    export const parser = createParser(
        {
            type,
            parent: () => reroot,
            children: () => [Literal.delegate, Str.delegate, Obj.delegate],
            fallback: (definition, { path }) => {
                throw new Error(definitionTypeError(definition, path))
            }
        },
        { matches: () => true }
    )
}
