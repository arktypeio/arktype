import { join } from "path"
import { readFileSync, writeFileSync } from "fs-extra"
import gql from "graphql-tag"
import { gqlize, typify } from ".."

describe("gqlize", () => {
    it("doesn't crash", async () => {
        const schemaContents = readFileSync(
            join(__dirname, "schema.gql")
        ).toString()
        const types = await typify(schemaContents, join(__dirname, "schema.ts"))
        writeFileSync(join(__dirname, "schema.ts"), types)
        const mutations = gqlize({
            schema: gql(schemaContents),
            upfilterKeys: ["create"]
        })
        console.warn(types)
        console.warn(mutations)
        expect(mutations).toBeTruthy()
    }, 9999999)
})
