import React, { FC } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
    Form,
    FormText,
    Column,
    Row,
    FormSubmit,
    Card,
    Button,
    useTheme
} from "@re-do/components"
import { SignUpInput } from "@re-do/model"
import Logo from "assets/logo.svg"
import { createValidator } from "custom/CustomForm"
import { store } from "renderer/common"
import { useMutation } from "@apollo/react-hooks"
import { submitForm } from "custom/CustomForm"
import gql from "graphql-tag"
import { Page } from "renderer/state"

type SignUpData = {
    signUp: {
        token: string
    }
}

export const SIGNUP = gql`
    mutation signUp(
        $firstName: String!
        $lastName: String!
        $email: String!
        $password: String!
    ) {
        signUp(
            firstName: $firstName
            lastName: $lastName
            email: $email
            password: $password
        ) {
            token
        }
    }
`

const validator = new SignUpInput()

export const SignUp: FC = () => {
    const theme = useTheme()
    const [submit] = useMutation<SignUpData, SignUpInput>(SIGNUP)
    return (
        <Column full justify="center" align="center">
            <Card
                style={{
                    width: theme.spacing(45),
                    height: theme.spacing(50),
                    padding: `${theme.spacing(3)}px ${theme.spacing(5)}px`
                }}
            >
                <Column full>
                    <Logo />
                    <Form<SignUpInput, SignUpData>
                        validator={validator}
                        submit={async (fields: any) => {
                            const result = await submitForm({ submit, fields })
                            if (result.data && result.data.signUp) {
                                store.mutate({
                                    token: result.data.signUp.token
                                })
                            }
                            return result
                        }}
                    >
                        <Column grow align="center">
                            <AnimatePresence>
                                <motion.div
                                    style={{ height: "100%", width: "100%" }}
                                    positionTransition
                                    initial={{
                                        x: 500
                                    }}
                                    animate={{ x: 0 }}
                                    exit={{ x: 500 }}
                                >
                                    <Column
                                        full
                                        justify="center"
                                        align="stretch"
                                    >
                                        <Row>
                                            <FormText
                                                name="firstName"
                                                label="first"
                                                autoFocus
                                            />
                                            <FormText
                                                name="lastName"
                                                label="last"
                                            />
                                        </Row>

                                        <FormText name="email" />

                                        <Row>
                                            <FormText
                                                type="password"
                                                name="password"
                                            />
                                            <FormText
                                                type="password"
                                                name="confirm"
                                            />
                                        </Row>
                                    </Column>
                                </motion.div>
                            </AnimatePresence>
                            <FormSubmit
                                responseOptions={{
                                    loading: { hideContent: true }
                                }}
                            >
                                Sign Up
                            </FormSubmit>
                        </Column>
                    </Form>
                </Column>
            </Card>

            <Button
                kind="secondary"
                onClick={() => store.mutate({ page: Page.SignIn })}
            >
                Back to sign in
            </Button>
        </Column>
    )
}
