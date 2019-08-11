import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { FormText, FormSubmit, Form } from "."
import { Text } from "../text"
import { Column } from "../layouts"
import { withKnobs, select } from "@storybook/addon-knobs"
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme } from "../styles"

storiesOf("Form", module)
    .addDecorator(withTheme())
    .add("Text only", () => <TextOnlyForm />)
    .addDecorator(withKnobs)

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
        </ThemeProvider>
    )
}
