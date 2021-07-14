import { getTests, run } from "@re-do/test"

describe.each(getTests())("", ({ name, id }) => {
    test(
        name,
        async () => {
            await run({ id })
        },
        30000
    )
})
