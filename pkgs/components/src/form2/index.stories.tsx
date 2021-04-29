import React, { useState } from "react"
import { Form, FormText, FormSubmit } from "."
import { Text } from "../text"

export default {
    title: "Form2"
}

export type Inputs = {
    name: string
}

export const form = () => {
    const [data, setData] = useState("Submit the form!")
    return (
        <>
            <Form<Inputs>
                onSubmit={(data) => setData(JSON.stringify(data, null, 4))}
            >
                <FormText name="first" defaultValue="Default Value" />
                <FormText
                    name="middle"
                    label="middle initial"
                    rules={{ maxLength: 1 }}
                />
                <FormText name="last" placeholder="Placeholder Value" />
                <FormSubmit />
            </Form>
            <Text>{data}</Text>
        </>
    )
}
