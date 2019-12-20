import { join } from "path"
import { readFileSync } from "fs-extra"
import gql from "graphql-tag"
import { gqlize } from ".."

describe("gqlize", () => {
    it("doesn't crash", async () => {
        const mutations = gqlize({
            schema: gql(readFileSync(join(__dirname, "schema.gql")).toString()),
            upfilterKeys: ["create"]
        })
        console.warn(mutations)
        expect(mutations).toBeTruthy()
    }, 9999999)
})
