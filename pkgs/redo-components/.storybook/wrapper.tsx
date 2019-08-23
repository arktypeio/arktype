import React from "react"
import { makeDecorator } from "@storybook/addons"
import { DefaultTheme } from "../src/styles"

export const withWrapper = makeDecorator({
    name: "withWrapper",
    parameterName: "wrapper",
    wrapper: (getStory, context, { parameters }) => {
        return (
            <div>
                <DefaultTheme>{getStory(context)}</DefaultTheme>
            </div>
        )
    }
})
