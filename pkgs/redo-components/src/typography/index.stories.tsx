import React from "react"
import { storiesOf } from "@storybook/react"
import { muiTheme } from "../utils"
import { ErrorText, Header, InfoText } from "."

storiesOf("Typography", module)
    .addDecorator(muiTheme())
    .add("ErrorText", () => <ErrorText> This is an ErrorText </ErrorText>)
    .add("Header", () => <Header> This is a header! </Header>)
    .add("InfoText", () => <InfoText> This is an InfoText </InfoText>)
