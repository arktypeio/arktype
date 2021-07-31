import { getTests, run } from "@re-do/test"

describe.each(getTests())("", ({ name, id }) => {
    test(
        name,
        async () => {
            expect(id).toBeGreaterThan(0)
            // Disabling temporaryil until CI is fixed
            // await run({ id })
        },
        30000
    )
})
