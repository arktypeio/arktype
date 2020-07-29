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
import { track } from "./analytics"

export type SignUpProps = {
    textVariant?: TextProps["variant"]
}

export const SignUp = ({ textVariant = "h4" }: SignUpProps) => {
    return (
        <>
            <Text variant={textVariant}>🚀Launching soon</Text>
            <Form<{ email: string }, boolean>
                validate={(_) => ({ email: [] })}
                submit={async (options: any) => {
                    track.prelaunchRegister({
                        email: options?.variables?.email!
                    })
                    console.log(
                        `User ${options?.variables?.email!} registered!`
                    )
                    return { data: true }
                }}
            >
                {({ data }) => (
                    <>
                        <FormText name="email" />
                        <FormSubmit>
                            {data ? (
                                <Button
                                    style={{
                                        fontSize: "large",
                                        fontWeight: 700
                                    }}
                                    disabled
                                >
                                    You're in the loop 💌
                                </Button>
                            ) : (
                                <Button
                                    style={{
                                        fontSize: "large",
                                        fontWeight: 700
                                    }}
                                >
                                    Keep me posted!
                                </Button>
                            )}
                        </FormSubmit>
                    </>
                )}
            </Form>
        </>
    )
}
