import { configure } from "@storybook/react"
// import "@storybook/addon-console"

// @ts-ignore
const req = require.context("../src", true, /\.stories.tsx$/)
const loadStories = () => req.keys().forEach((file: string) => req(file))

configure(loadStories, module)
