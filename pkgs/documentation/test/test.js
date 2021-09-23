import { getTests, run } from "@re-do/test"

describe.each(getTests())("", ({ name, id }) => {
    it(
        name,
        async () => {
            await run({ id })
        },
        30000
    )
})
