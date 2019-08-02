import React, { useState } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { RespondTo } from "."
import { InfoText } from "../text"
import { TextInput } from "../inputs"

storiesOf("Response", module)
    .addDecorator(withTheme())
    .add("Data updates", () => <InputResponse />)

const InputResponse = () => {
    const [value, setValue] = useState("")
    return (
        <>
            <TextInput
                value={value}
                onChange={event => setValue(event.target.value)}
            />
            <RespondTo
                response={{
                    data: value,
                    loading: true,
                    errors: ["error 1", "error 2"]
                }}
                options={{
                    data: {
                        onChange: value =>
                            !value || console.log(`the state is ${value}`),
                        displayAs: ({ value }) => <InfoText>{value}</InfoText>
                    }
                }}
            >
                <InfoText> This is the content.</InfoText>
            </RespondTo>
        </>
    )
}
