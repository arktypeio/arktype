import { join } from "path"
import { readFileSync } from "fs-extra"
import gql from "graphql-tag"
import { gqlize } from ".."

describe("gqlize", () => {
    it("doesn't crash", async () => {
        const schemaContents = readFileSync(
            join(__dirname, "schema.gql")
        ).toString()
        const mutations = gqlize({
            schema: gql(schemaContents)
        })
        console.log(mutations)
        expect(mutations).toBeTruthy()
    })
})
