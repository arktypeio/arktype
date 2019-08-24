import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs } from "@storybook/addon-knobs"
import { Text } from "../text"
import { Column } from "../layouts"
import { AutoForm, Form, FormText, FormSubmit } from "."

storiesOf("Form", module)
    .add("Text only", () => <TextOnlyForm />)
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
            contents={{ first: "Sarthak", last: "Agrawal" }}
        />
    ))

type TextOnlyFormFields = {
    first: string
    last: string
}

const TextOnlyForm: FC = () => (
    <Form<TextOnlyFormFields, string>
        submit={async ({ first, last }) => ({
            data: `Hello, ${first} ${last}.`
        })}
        validator={({ first, last }) => {
            return {
                first: first ? [] : ["We need this!"],
                last: last ? [] : ["We need this!"]
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
)
