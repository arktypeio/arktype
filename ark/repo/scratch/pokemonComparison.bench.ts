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
		counters: []
	},
	{
		name: "Charizard",
		type: "Fire",
		counters: ["Grass", "Ice", "Bug", "Steel"]
	},
	{
		name: "Pikachu",
		type: "Electric",
		counters: ["Water", "Flying"]
	},
	{
		name: "Venusaur",
		type: "Grass",
		counters: ["Water", "Ground", "Rock"]
	},
	{
		name: "Glaceon",
		type: "Ice",
		counters: ["Grass", "Ground", "Flying", "Dragon"]
	},
	{
		name: "Machamp",
		type: "Fighting",
		counters: ["Normal", "Ice", "Rock", "Dark", "Steel"]
	},
	{
		name: "Muk",
		type: "Poison",
		counters: ["Grass", "Fairy"]
	},
	{
		name: "Dugtrio",
		type: "Ground",
		counters: ["Fire", "Electric", "Poison", "Rock", "Steel"]
	},
	{
		name: "Pidgeot",
		type: "Flying",
		counters: ["Grass", "Fighting", "Bug"]
	},
	{
		name: "Alakazam",
		type: "Psychic",
		counters: ["Fighting", "Poison"]
	},
	{
		name: "Scizor",
		type: "Bug",
		counters: ["Grass", "Psychic", "Dark"]
	},
	{
		name: "Golem",
		type: "Rock",
		counters: ["Fire", "Ice", "Flying", "Bug"]
	},
	{
		name: "Gengar",
		type: "Ghost",
		counters: ["Psychic", "Ghost"]
	},
	{
		name: "Dragonite",
		type: "Dragon",
		counters: ["Dragon"]
	},
	{
		name: "Tyranitar",
		type: "Dark",
		counters: ["Psychic", "Ghost"]
	},
	{
		name: "Steelix",
		type: "Steel",
		counters: ["Ice", "Rock", "Fairy"]
	},
	{
		name: "Blastoise",
		type: "Water",
		counters: ["Fire", "Ground", "Rock"]
	},
	{
		name: "Gardevoir",
		type: "Fairy",
		counters: ["Fighting", "Dragon", "Dark"]
	}
]

const PokeType = type.enumerated(...types)

const ArkPokemon = type.or(
	...types.map(t =>
		type({
			name: "string",
			counters: PokeType.array(),
			type: type.unit(t)
		})
	)
)

const PokemonTypeBox = Type.Union(
	types.map(t =>
		Type.Object({
			name: Type.String(),
			counters: Type.Array(Type.Union(types.map(t => Type.Literal(t)))),
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
			counters: z.array(z.enum(types)),
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
