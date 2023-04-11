import { expect, test } from "@oclif/test"

describe("test", () => {
    test.stdout()
        .command(["test"])
        .it("runs hello", (ctx) => {
            expect(ctx.stdout).to.contain("hello world")
        })

    test.stdout()
        .command(["test", "--name", "jeff"])
        .it("runs hello --name jeff", (ctx) => {
            expect(ctx.stdout).to.contain("hello jeff")
        })
})
