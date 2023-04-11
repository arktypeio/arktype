import { expect, test } from "@oclif/test"

describe("bench", () => {
    test.stdout()
        .command(["bench"])
        .it("runs hello", (ctx) => {
            expect(ctx.stdout).to.contain("hello world")
        })

    test.stdout()
        .command(["bench", "--name", "jeff"])
        .it("runs hello --name jeff", (ctx) => {
            expect(ctx.stdout).to.contain("hello jeff")
        })
})
