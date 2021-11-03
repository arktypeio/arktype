import React, { useState } from "react"
import { Form, FormText, FormSubmit, FormCheck } from "."
import { Text } from "../text"

export default {
    title: "Forms"
}

type Inputs = {
    first: string
    middle: string
    last: string
    serverBroken: boolean
}

export const form = () => {
    const [data, setData] = useState("Submit the form!")
    return (
        <>
            <Form<Inputs>
                submit={async (data) =>
                    new Promise((resolve, reject) =>
                        setTimeout(() => {
                            if (data.serverBroken) {
                                setData("")
                                reject("Something went very wrong.")
                            } else {
                                setData(JSON.stringify(data, null, 4))
                                resolve(data)
                            }
                        }, 1000)
                    )
                }
            >
                <FormText name="first" defaultValue="Default Value" />
                <FormText
                    name="middle"
                    label="middle initial"
                    // @ts-ignore
                    rules={{ maxLength: 1 }}
                />
                <FormText name="last" placeholder="Placeholder Value" />
                <FormCheck name="serverBroken" label="Break the server?" />
                <FormSubmit />
            </Form>
            <Text>{data}</Text>
        </>
    )
}
