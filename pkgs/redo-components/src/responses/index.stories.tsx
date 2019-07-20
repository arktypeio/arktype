import React from "react"
import { storiesOf } from "@storybook/react"
import { muiTheme } from "../utils"
import { Response } from "."
import { InfoText } from "../typography"

storiesOf("Response", module)
    .addDecorator(muiTheme())
    .add("Response component loading", () => (
        <Response isLoading={true}>
            <InfoText> This is what shows for the response.</InfoText>
        </Response>
    ))
    .add("Response component not loading", () => (
        <Response isLoading={false}>
            <InfoText> This is text when you've finished loading. </InfoText>
        </Response>
    ))
