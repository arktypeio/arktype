import { scope, type } from "arktype"

export const $ = scope({ node: { value: "number", "next?": "node" } })

export const types = $.export()

export const Linked = $.type({ head: "node" })

export const Ids = type.module({ id: "string", pair: ["id", "id"] })
