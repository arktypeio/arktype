import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ErrorText } from "."

storiesOf("Text", module)
    .addDecorator(withTheme())
    .add("ErrorText", () => <ErrorText> This is an ErrorText </ErrorText>)
