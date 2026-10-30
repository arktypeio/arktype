import { type } from "arktype"

export enum Color {
	Red = "red",
	Blue = "blue"
}

export const Colors = type.valueOf(Color)

export const Reds = type({ color: type.unit(Color.Red) })
