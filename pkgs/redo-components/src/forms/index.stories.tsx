import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { FormText, FormSubmit, Form, AutoForm } from "."
import { Text } from "../text"
import { Column } from "../layouts"
import { withKnobs, select } from "@storybook/addon-knobs"
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme } from "../styles"

storiesOf("Form", module)
    .addDecorator(withTheme())
    .addDecorator(withKnobs)
    .add("Text only", () => <TextOnlyForm />)
    .add("AutoForm", () => (
        <AutoForm<TextOnlyFormFields, string>
            submit={async ({ first, last }) => ({
                data: `Hello, ${first} ${last}.`
            })}
            validator={_ => {
                return {
                    first: [],
                    last: []
                }
            }}
            contents={{ first: "str", last: "st" }}
        />
    ))

type TextOnlyFormFields = {
    first: string
    last: string
}

const TextOnlyForm: FC = () => {
    return (
        <ThemeProvider theme={defaultTheme}>
            <Form<TextOnlyFormFields, string>
                submit={async ({ first, last }) => ({
                    data: `Hello, ${first} ${last}.`
                })}
                validator={_ => {
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
        </ThemeProvider>
    )
}
