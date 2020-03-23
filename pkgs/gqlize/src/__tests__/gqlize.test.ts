import { join } from "path"
import { readFileSync } from "fs-extra"
import gql from "graphql-tag"
import { fromEntries, camelCase } from "@re-do/utils"
import { gqlize, getObjectDefinition } from ".."

describe("gqlize", () => {
    const schema = gql(readFileSync(join(__dirname, "schema.gql")).toString())
    it("works with default options", async () => {
        expect(gqlize({ schema })).toMatchSnapshot("defaults")
    })
    it("can generate new queries from defaults", async () => {
        expect(
            gqlize({
                schema,
                mapped: {
                    me: (data, schema) => {
                        const userType = getObjectDefinition("User", schema)
                        return fromEntries(
                            userType.fields.map((field) => [
                                camelCase(["my", field.name.value]),
                                {
                                    ...data,
                                    fields: data.fields.filter(
                                        (resultField) =>
                                            resultField.name.value ===
                                            field.name.value
                                    ),
                                },
                            ])
                        )
                    },
                },
            })
        ).toMatchSnapshot("mapped")
    })
})
