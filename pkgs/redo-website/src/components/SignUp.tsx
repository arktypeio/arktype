import React from "react"
import { Form, FormText, FormSubmit, Button, Column } from "redo-components"
import { track } from "../Analytics"

export const SignUp = () => {
    return (
        <Form<{ email: string }>
            validate={_ => ({ email: [] })}
            submit={async ({ email }) => track.prelaunchRegister({ email })}
        >
            <Column>
                <FormText name="email" />
                <FormSubmit
                    responseOptions={{
                        data: {
                            displayAs: () => (
                                <Button disabled>You're in the loop 💌</Button>
                            ),
                            hideContent: true
                        }
                    }}
                >
                    Keep me posted!
                </FormSubmit>
            </Column>
        </Form>
    )
}
