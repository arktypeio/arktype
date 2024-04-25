import { reference } from "@arktype/util"
import type { SchemaDef } from "../../node.js"
import type { RawSchema } from "../../schema.js"

export type ChildSchemaReference<$ = any> = `$${keyof $ & string}`

export type ChildSchema<$ = any> = RawSchema | ChildSchemaReference<$>

export type ChildSchemaDef<$ = any> = SchemaDef | ChildSchemaReference<$>

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = reference(arrayIndexMatcher)
