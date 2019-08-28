import React, { FC, useState } from "react"
import { storiesOf } from "@storybook/react"
import { Text } from "../text"
import { TextInput } from "../inputs"
import { RespondTo } from "."

storiesOf("Response", module).add("Data updates", () => <InputResponse />)

const InputResponse: FC = () => {
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
