import React from "react"
import {
    Form,
    FormText,
    FormSubmit,
    Button,
    Column,
    Text
} from "@re-do/components"
import { track } from "../analytics"

export const SignUp = () => {
    return (
        <Column align="center">
            <Text variant="h4">🚀Launching 8/24</Text>
            <Form<{ email: string }>
                validator={_ => ({ email: [] })}
                submit={async ({ email }) => track.prelaunchRegister({ email })}
            >
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
            </Form>
        </Column>
    )
}
