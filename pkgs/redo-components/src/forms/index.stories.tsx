import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { FormText, FormSubmit, Form } from "."
import { Text } from "../text"
import { Column } from "../layouts"

storiesOf("Form", module)
    .addDecorator(withTheme())
    .add("Text only", () => <TextOnlyForm />)

type TextOnlyFormFields = {
    first: string
    last: string
}

const TextOnlyForm: FC = () => {
    return (
        <Form<TextOnlyFormFields, string>
            submit={async ({ first, last }) => ({
                data: `Hello, ${first} ${last}.`
            })}
            validate={_ => {
                return {
                    first: [],
                    last: []
                }
            }}
        >
            <Column width={200}>
                <FormText name="first" />
                <FormText name="last" />
                <FormSubmit
                    responseOptions={{
                        data: { displayAs: data => <Text>{data.value}</Text> }
                    }}
                >
                    Submit
                </FormSubmit>
            </Column>
        </Form>
    )
}
