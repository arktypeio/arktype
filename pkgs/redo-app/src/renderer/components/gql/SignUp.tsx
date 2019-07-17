import React from "react"
import { component } from "blocks"
import { Mutation } from "react-apollo"
import { Session, SignUpInput } from "redo-model"
import gql from "graphql-tag"
import { MutationProps } from "./Mutation"
import { createFormSubmit } from "blocks"

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

export type WithSignUpProps = MutationProps<SignUpInput, SignUpData>

export type SignUpData = {
    signUp: Session
}

export const WithSignUp = component({
    name: "WithSignUp",
    defaultProps: {} as Partial<WithSignUpProps>,
    store: true
})(({ children, variables, store }) => (
    <Mutation<SignUpData, SignUpInput>
        mutation={SIGNUP}
        variables={variables}
        onCompleted={data => store.mutate({ token: data.signUp.token })}
    >
        {children}
    </Mutation>
))

const InnerSignUpSubmit = createFormSubmit<SignUpInput, SignUpData>()

export const SignUpSubmit = () => (
    <InnerSignUpSubmit unsubmitted={["confirm"]} Mutation={WithSignUp} />
)
