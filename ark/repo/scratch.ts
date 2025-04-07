import { jsonSchemaToType } from "@ark/json-schema"

const S = jsonSchemaToType({ type: "string", minLength: 5, maxLength: 10 })

S.assert("arktype") //?
S.assert("zod") //?
