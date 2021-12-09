import React from "react"
import { FormText, FormSubmit, Form } from "@re-do/components"
import { store } from "renderer/common"
import { formatEmail } from "./common.js"
// import { useSignInMutation, SignInMutationVariables } from "@re-do/model"

export const SignIn = () => <></>
// {
//     const [submit] = useSignInMutation()
//     const disabled = store.useGet("page") !== "SIGN_IN"
//     return (
//         <Form<SignInMutationVariables>
//             submit={async (data) => {
//                 const result = await submit({ variables: data })
//                 store.update({ token: result?.data?.signIn ?? "" })
//             }}
//             grow
//             full
//             justify="center"
//         >
//             <FormText
//                 name="email"
//                 disabled={disabled}
//                 errorTooltipPlacement="right"
//                 transform={formatEmail}
//                 autoFocus
//             />
//             <FormText
//                 type="password"
//                 errorTooltipPlacement="right"
//                 name="password"
//                 disabled={disabled}
//             />
//             <FormSubmit>Sign in</FormSubmit>
//         </Form>
//     )
// }
