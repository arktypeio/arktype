import { makeDecorator } from "@storybook/addons"
import { DefaultTheme } from "../src/styles"

export const withWrapper = makeDecorator({
    name: "withWrapper",
    parameterName: "wrapper",
    wrapper: (getStory, context, { parameters }) => {
        return <DefaultTheme>{getStory(context)}</DefaultTheme>
    }
})
