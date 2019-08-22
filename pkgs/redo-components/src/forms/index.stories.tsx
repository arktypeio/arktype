import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs } from "@storybook/addon-knobs"
import { T } from "../styles"
import { Text } from "../text"
import { Column } from "../layouts"
import { Form, FormText, FormSubmit } from "."

storiesOf("Form", module)
    .add("Text only", () => <TextOnlyForm />)
    .addDecorator(withKnobs)

type TextOnlyFormFields = {
    first: string
    last: string
}

const TextOnlyForm: FC = () => {
    return (
        <T>
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
                            data: {
                                displayAs: data => <Text>{data.value}</Text>
                            }
                        }}
                    >
                        Submit
                    </FormSubmit>
                </Column>
            </Form>
        </T>
    )
}
