import { scripts } from ".."

it("calls the right script", () => {
    const shouldBeCalled = jest.fn()
    const shouldntBeCalled = jest.fn()
    scripts(
        {
            dev: {
                shouldBeCalled
            },
            prod: {
                shouldntBeCalled
            }
        },
        {
            autoGenerate: false,
            scriptName: "shouldBeCalled"
        }
    )
    expect(process.env.NODE_ENV).toBe("development")
    expect(shouldBeCalled).toBeCalledTimes(1)
    expect(shouldntBeCalled).not.toBeCalled()
})
