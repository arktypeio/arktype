import { configure } from "@storybook/react"
import "@storybook/addon-console"
import requireContext from "require-context.macro"

const req = requireContext("../src", true, /.stories.tsx$/)
function loadStories() {
    req.keys().forEach((filename: string) => req(filename))
}

configure(loadStories, module)
