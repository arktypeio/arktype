import React from "react"
import {
    Form,
    FormText,
    FormSubmit,
    Button,
    Column,
    Text,
    TextProps
} from "@re-do/components"
import { track } from "../analytics"
import { layout } from "../constants"

export type SignUpProps = {
    textVariant?: TextProps["variant"]
}

export const SignUp = ({ textVariant = "h4" }: SignUpProps) => {
    return (
        <Column align="center" width={layout.signUpWidth}>
            <Text variant={textVariant}>🚀Launching soon</Text>
            <Form<{ email: string }, boolean>
                validate={(_) => ({ email: [] })}
                submit={async (options: any) => {
                    track.prelaunchRegister({
                        email: options?.variables?.email!
                    })
                    return { data: true }
                }}
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
