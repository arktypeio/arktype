import {
    transform,
    ElementOf,
    TypeError,
    ListPossibleTypes,
    Evaluate,
    StringifyPossibleTypes,
    MergeAll,
    DiffUnions,
    UnionDiffResult,
    RemoveSpaces,
    Split,
    Join,
    Unlisted,
    Narrow,
    WithDefaults,
    Or
} from "@re-do/utils"
import {
    OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInTypeName,
    UnvalidatedObjectDefinition,
    FunctionDefinition,
    StringLiteralDefinition,
    NumericStringLiteralDefinition
} from "../common.js"
import { StringDefinitionRecurse } from "../definitions.js"
import { DefinitionTypeError, UnknownTypeError } from "../errors.js"
import {
    ParseStringDefinitionRecurse,
    ParseTypeRecurseOptions
} from "../parse.js"
