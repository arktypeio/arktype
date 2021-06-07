import React from "react"
import { TextInput, TextInputProps } from "@re-do/components"
import { store } from "renderer/common"

export type SearchInputProps = Omit<TextInputProps, "variant">

const onChange = async (event: React.ChangeEvent<HTMLInputElement>) =>
    store.update({
        cardFilter: event.target.value
    })

export const SearchInput = ({ ...rest }: SearchInputProps) => (
    <TextInput
        kind="underlined"
        colorTemplate="light"
        {...{ onChange, ...rest }}
    />
)
