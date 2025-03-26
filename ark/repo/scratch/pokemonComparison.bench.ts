import { bench } from "@ark/attest"
import { Type } from "@sinclair/typebox"
import { TypeCompiler } from "@sinclair/typebox/compiler"
import { Ajv } from "ajv"
import { type } from "arktype"
import { z } from "zod"

const types = [
	"Normal",
	"Fire",
	"Water",
	"Electric",
	"Grass",
	"Ice",
	"Fighting",
	"Poison",
	"Ground",
	"Flying",
	"Psychic",
	"Bug",
	"Rock",
	"Ghost",
	"Dragon",
	"Dark",
	"Steel",
	"Fairy"
] as const

type Pokemon = typeof ArkPokemon.infer

const pokedex: Pokemon[] = [
	{
		name: "Eevee",
		type: "Normal",
		strong: []
	},
	{
		name: "Charizard",
		type: "Fire",
		strong: ["Grass", "Ice", "Bug", "Steel"]
	},
	{
		name: "Blastoise",
		type: "Water",
		strong: ["Fire", "Ground", "Rock"]
	},
	{
		name: "Pikachu",
		type: "Electric",
		strong: ["Water", "Flying"]
	},
	{
		name: "Venusaur",
		type: "Grass",
		strong: ["Water", "Ground", "Rock"]
	},
	{
		name: "Glaceon",
		type: "Ice",
		strong: ["Grass", "Ground", "Flying", "Dragon"]
	},
	{
		name: "Machamp",
		type: "Fighting",
		strong: ["Normal", "Ice", "Rock", "Dark", "Steel"]
	},
	{
		name: "Muk",
		type: "Poison",
		strong: ["Grass", "Fairy"]
	},
	{
		name: "Dugtrio",
		type: "Ground",
		strong: ["Fire", "Electric", "Poison", "Rock", "Steel"]
	},
	{
		name: "Pidgeot",
		type: "Flying",
		strong: ["Grass", "Fighting", "Bug"]
	},
	{
		name: "Alakazam",
		type: "Psychic",
		strong: ["Fighting", "Poison"]
	},
	{
		name: "Scizor",
		type: "Bug",
		strong: ["Grass", "Psychic", "Dark"]
	},
	{
		name: "Golem",
		type: "Rock",
		strong: ["Fire", "Ice", "Flying", "Bug"]
	},
	{
		name: "Gengar",
		type: "Ghost",
		strong: ["Psychic", "Ghost"]
	},
	{
		name: "Dragonite",
		type: "Dragon",
		strong: ["Dragon"]
	},
	{
		name: "Tyranitar",
		type: "Dark",
		strong: ["Psychic", "Ghost"]
	},
	{
		name: "Steelix",
		type: "Steel",
		strong: ["Ice", "Rock", "Fairy"]
	},
	{
		name: "Gardevoir",
		type: "Fairy",
		strong: ["Fighting", "Dragon", "Dark"]
	}
]

const ArkPokemon = type.or(
	...types.map(t =>
		type({
			name: "string",
			strong: type.enumerated(...types).array(),
			type: `"${t}"`
		})
	)
)

const PokemonTypeBox = Type.Union(
	types.map(t =>
		Type.Object({
			name: Type.String(),
			strong: Type.Array(Type.Union(types.map(t => Type.Literal(t)))),
			type: Type.Literal(t)
		})
	)
)

const TypeBoxPokemon = TypeCompiler.Compile(PokemonTypeBox)

const AjvPokemon = new Ajv({}).compile(PokemonTypeBox)

const ZodPokemon = z.union(
	types.map(t =>
		z.object({
			name: z.string(),
			strong: z.array(z.enum(types)),
			type: z.literal(t)
		})
	) as never
)

bench("ark", () => {
	for (const pokemon of pokedex) {
		ArkPokemon(pokemon)
	}
}).median([0.34, "us"])

bench("ajv", () => {
	for (const pokemon of pokedex) {
		AjvPokemon(pokemon)
	}
}).median([158.41, "us"])

bench("typebox", () => {
	for (const pokemon of pokedex) {
		TypeBoxPokemon.Check(pokemon)
	}
}).median([3.26, "us"])

bench("zod", () => {
	for (const pokemon of pokedex) {
		ZodPokemon.parse(pokemon)
	}
}).median([212.52, "us"])
