import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { FormText } from "./"
import { FormSubmit } from "./FormSubmit"
import { Form } from "./Form"

storiesOf("Form", module)
    .addDecorator(withTheme())
    .add("FormText", () => <FormTextSample />)
//this doesn't have anything to put in <>?
const FormTextSample: FC = () => {
    return (
        <Form
            submit={async () => ({ data: 42 })}
            validate={_ => {
                return {
                    Firstname: [],
                    Lastname: []
                }
            }}
        >
            <FormText name="Firstname" />
            <FormText name="Lastname" />
            <FormSubmit
                responseOptions={{
                    data: { displayAs: data => <p>{data.value}</p> }
                }}
            >
                Submit
            </FormSubmit>
        </Form>
    )
}
