import { generateFileContents } from "../generateScripts"

const scripts = {
    sayHello: "echo hello",
    sayGoodBye: "echo goodBye",
    "handle:non-alpha": "echo handled"
}

it("generates js", () => {
    expect(generateFileContents(scripts, { language: "js" })).toMatchSnapshot()
})

it("generates ts", () => {
    expect(generateFileContents(scripts, { language: "ts" })).toMatchSnapshot()
})
