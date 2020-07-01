import { join } from "path"
import { fromEntries, camelCase } from "@re-do/utils"
import { gqlize, getObjectDefinition } from ".."

describe("gqlize", () => {
    const schema = join(__dirname, "schema.gql")
    it("works with default options", async () => {
        expect(gqlize({ schema })).toMatchSnapshot("defaults")
    })
    it("can generate new queries from defaults", async () => {
        gqlize({
            schema,
            queries: {
                me: {
                    branch: (data, schema) => {
                        const userType = getObjectDefinition("User", schema)
                        return fromEntries(
                            userType.fields.map((field) => [
                                camelCase(["my", field.name.value]),
                                {
                                    ...data,
                                    fields: data.output.fields.filter(
                                        (resultField) =>
                                            resultField.name.value ===
                                            field.name.value
                                    )
                                }
                            ])
                        )
                    }
                }
            }
        })
    }),
        it("can transform existing queries", async () => {
            const transformed = gqlize({
                schema,
                queries: {
                    me: {
                        map: (data) => ({ ...data, name: "myself" })
                    }
                }
            })
            expect(transformed).toContain("query myself")
            expect(transformed).not.toContain("query me")
        }),
        it("can globally transform queries", async () => {
            const transformed = gqlize({
                schema,
                transformOutputs: (fields) =>
                    fields.filter((field) => field.name.value !== "user")
            })
            expect(transformed).not.toContain("user")
        })
})
