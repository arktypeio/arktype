import React, { useState } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { RespondTo } from "."
import { Text } from "../text"
import { TextInput } from "../inputs"

storiesOf("Response", module)
    .addDecorator(withTheme())
    .add("Data updates", () => <InputResponse />)

const InputResponse = () => {
    const [value, setValue] = useState("")
    return (
        <RespondTo
            response={{
                data: value,
                loading: true,
                errors: ["error 1", "error 2"]
            }}
            options={{
                data: {
                    onChange: value => console.log(`the state is ${value}`),
                    displayAs: ({ value }) => <Text>{value}</Text>
                }
            }}
        >
            <TextInput
                value={value}
                onChange={event => setValue(event.target.value)}
            />
        </RespondTo>
    )
}
