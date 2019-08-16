import { configure } from "@storybook/react"

// @ts-ignore
const req = require.context("../src", true, /.stories.tsx$/)
function loadStories() {
    req.keys().forEach((filename: string) => req(filename))
}

configure(loadStories, module)
