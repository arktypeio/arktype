import React from "react"
import { makeDecorator } from "@storybook/addons"
import { DefaultTheme } from "../src/styles"

export const withDefaultContext = makeDecorator({
    name: "withDefaultContext",
    parameterName: "defaultContext",
    wrapper: (getStory, context, { parameters }) => (
        <DefaultTheme>{getStory(context)}</DefaultTheme>
    )
})
