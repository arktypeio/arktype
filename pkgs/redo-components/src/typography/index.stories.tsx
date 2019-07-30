import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ErrorText, Header, InfoText } from "."

storiesOf("Typography", module)
    .addDecorator(withTheme())
    .add("ErrorText", () => <ErrorText> This is an ErrorText </ErrorText>)
    .add("Header", () => <Header> This is a header! </Header>)
    .add("InfoText", () => <InfoText> This is an InfoText </InfoText>)
