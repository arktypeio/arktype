import React from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { AnimatePresence, motion } from "framer-motion"
import {
    Form,
    FormText,
    Column,
    Row,
    CardPage,
    FormSubmit,
    ErrorText
} from "redo-components"
import { SecondarySignInButton } from "custom"
import { component } from "blocks"
import { SignUpInput } from "redo-model"
import Logo from "assets/logo.svg"
import { createValidator, UseMutation } from "custom/CustomForm"
import { ResponseState } from "redo-components"
import { store } from "renderer/common"
import { useMutation } from "@apollo/react-hooks"
import gql from "graphql-tag"
import { submitForm } from "custom/CustomForm"

const stylize = makeStyles((theme: Theme) => ({
    animatedFields: {
        flexGrow: 1
    }
}))

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

const validate = createValidator(new SignUpInput())

export const SignUp = () => {
    const { animatedFields } = stylize()
    const [submit] = useMutation<SignUpData, SignUpInput>(SIGNUP)
    return (
        <Column align="center" justify="center">
            <CardPage>
                <Form<SignUpInput, SignUpData>
                    validate={validate}
                    submit={async fields => {
                        const result = await submitForm({ submit, fields })
                        if (result.data && result.data.signUp) {
                            store.mutate({ token: result.data.signUp.token })
                        }
                        return result
                    }}
                >
                    <Column justify="space-evenly" className={animatedFields}>
                        <Logo />
                        <AnimatePresence>
                            <motion.div
                                positionTransition
                                initial={{
                                    x: 500
                                }}
                                animate={{ x: 0 }}
                                exit={{ x: 500 }}
                                className={animatedFields}
                            >
                                <Row spacing={1}>
                                    <FormText
                                        name="firstName"
                                        label="first"
                                        autoFocus
                                    />
                                    <FormText name="lastName" label="last" />
                                </Row>
                                <Row spacing={1}>
                                    <FormText name="email" />
                                </Row>
                                <Row spacing={1}>
                                    <FormText type="password" name="password" />
                                    <FormText type="password" name="confirm" />
                                </Row>
                            </motion.div>
                        </AnimatePresence>
                        <FormSubmit<SignUpData>
                            responseOptions={{
                                loading: { hideContent: true }
                            }}
                        >
                            Sign Up
                        </FormSubmit>
                    </Column>
                </Form>
            </CardPage>
            <SecondarySignInButton>Back to sign in</SecondarySignInButton>
        </Column>
    )
}
