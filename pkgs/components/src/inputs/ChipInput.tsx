import React from "react"
import { Theme } from "../styles"
import { makeStyles } from "@material-ui/styles"
import MuiChipInput, {
    Props as MuiChipInputProps
} from "material-ui-chip-input"
import { TextInputProps, useTextFieldProps } from "./TextInput"
import {} from "react-autosuggest"

const stylizeChip = makeStyles((theme: Theme) => ({
    chipClass: ({ colorTemplate }: Pick<TextInputProps, "colorTemplate">) => ({
        margin: 4,
        color: colorTemplate === "light" ? "black" : "white",
        backgroundColor:
            colorTemplate === "light"
                ? theme.palette.background.paper
                : theme.palette.primary.light
    })
}))

export type ChipInputProps = Omit<TextInputProps, "kind"> &
    MuiChipInputProps & { suggestions?: string[] }

export const ChipInput = (props: ChipInputProps) => {
    const textFieldProps = useTextFieldProps(props)
    const { colorTemplate, suggestions } = props
    const { chipClass } = stylizeChip({ colorTemplate })
    // @ts-ignore
    return (
        <MuiChipInput
            // Enter and Space, respectively
            newChipKeyCodes={[13, 32]}
            // @ts-ignore
            {...textFieldProps}
            // @ts-ignore
            classes={{ ...textFieldProps.classes, chip: chipClass }}
        />
    )
}
