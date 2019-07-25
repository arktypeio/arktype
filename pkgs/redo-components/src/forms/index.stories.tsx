import React from "react"
import { storiesOf } from "@storybook/react"
import { muiTheme } from "../utils"
import { FormText } from "./"
import { FormSubmit } from "./FormSubmit"
import { Form } from "./Form"
import { InfoText } from "typography"

storiesOf("Form", module)
    .addDecorator(muiTheme())
    .add("FormText", () => <FormTextSample />)

const FormTextSample = () => {
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
            <FormText name="Firstname" required={true} />
            <FormText name="Lastname" required={true} />
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
