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
            <Text variant="h4">🚀Launching soon</Text>
            <Form<{ email: string }>
                validator={_ => ({ email: [] })}
                submit={async ({ email }) => track.prelaunchRegister({ email })}
            >
                {({ data }) => (
                    <>
                        <FormText name="email" />
                        <FormSubmit>
                            {data ? (
                                <Button disabled>You're in the loop 💌</Button>
                            ) : (
                                <Button>Keep me posted!</Button>
                            )}
                        </FormSubmit>
                    </>
                )}
            </Form>
        </Column>
    )
}
