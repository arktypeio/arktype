import type { ArkError, ArkErrors, Morph } from "@ark/schema"
import type { ErrorType, merge } from "@ark/util"
import type {
	distill,
	inferIntersection,
	inferMorph,
	inferMorphOut,
	inferNaryIntersection,
	inferNaryMerge,
	inferNaryPipe
} from "./attributes.ts"
import type { type } from "./keywords/keywords.ts"
import type { inferDefinition } from "./parser/definition.ts"
import type { Type } from "./type.ts"
import type { instantiateType } from "./variants/instantiate.ts"
import type { NonObjectMergeErrorMessage } from "./variants/object.ts"

export type NaryUnionParser<$> = {
	(): Type<never, $>
	<const a, r = Type<inferDefinition<a, $>, $>>(
		a: type.validate<a, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		r = Type<inferDefinition<a, $> | inferDefinition<b, $>, $>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		r = Type<
			inferDefinition<a, $> | inferDefinition<b, $> | inferDefinition<c, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>
			| inferDefinition<j, $>
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>
			| inferDefinition<j, $>
			| inferDefinition<k, $>
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>
			| inferDefinition<j, $>
			| inferDefinition<k, $>
			| inferDefinition<l, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>
			| inferDefinition<j, $>
			| inferDefinition<k, $>
			| inferDefinition<l, $>
			| inferDefinition<m, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>
			| inferDefinition<j, $>
			| inferDefinition<k, $>
			| inferDefinition<l, $>
			| inferDefinition<m, $>
			| inferDefinition<n, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>
			| inferDefinition<j, $>
			| inferDefinition<k, $>
			| inferDefinition<l, $>
			| inferDefinition<m, $>
			| inferDefinition<n, $>
			| inferDefinition<o, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>
			| inferDefinition<j, $>
			| inferDefinition<k, $>
			| inferDefinition<l, $>
			| inferDefinition<m, $>
			| inferDefinition<n, $>
			| inferDefinition<o, $>
			| inferDefinition<p, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		const q,
		r = Type<
			| inferDefinition<a, $>
			| inferDefinition<b, $>
			| inferDefinition<c, $>
			| inferDefinition<d, $>
			| inferDefinition<e, $>
			| inferDefinition<f, $>
			| inferDefinition<g, $>
			| inferDefinition<h, $>
			| inferDefinition<i, $>
			| inferDefinition<j, $>
			| inferDefinition<k, $>
			| inferDefinition<l, $>
			| inferDefinition<m, $>
			| inferDefinition<n, $>
			| inferDefinition<o, $>
			| inferDefinition<p, $>
			| inferDefinition<q, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>,
		q: type.validate<q, $>
	): r extends infer _ ? _ : never
	<
		const defs extends readonly unknown[],
		r = Type<inferDefinition<defs[number], $>, $>
	>(
		...defs: { [i in keyof defs]: type.validate<defs[i], $> }
	): r extends infer _ ? _ : never
}

export type NaryIntersectionParser<$> = {
	(): Type<unknown, $>
	<const a, r = Type<inferDefinition<a, $>, $>>(
		a: type.validate<a, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		r = Type<inferIntersection<inferDefinition<a, $>, inferDefinition<b, $>>, $>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		r = Type<
			inferNaryIntersection<
				[inferDefinition<a, $>, inferDefinition<b, $>, inferDefinition<c, $>]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>,
					inferDefinition<j, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>,
					inferDefinition<j, $>,
					inferDefinition<k, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>,
					inferDefinition<j, $>,
					inferDefinition<k, $>,
					inferDefinition<l, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>,
					inferDefinition<j, $>,
					inferDefinition<k, $>,
					inferDefinition<l, $>,
					inferDefinition<m, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>,
					inferDefinition<j, $>,
					inferDefinition<k, $>,
					inferDefinition<l, $>,
					inferDefinition<m, $>,
					inferDefinition<n, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>,
					inferDefinition<j, $>,
					inferDefinition<k, $>,
					inferDefinition<l, $>,
					inferDefinition<m, $>,
					inferDefinition<n, $>,
					inferDefinition<o, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>,
					inferDefinition<j, $>,
					inferDefinition<k, $>,
					inferDefinition<l, $>,
					inferDefinition<m, $>,
					inferDefinition<n, $>,
					inferDefinition<o, $>,
					inferDefinition<p, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		const q,
		r = Type<
			inferNaryIntersection<
				[
					inferDefinition<a, $>,
					inferDefinition<b, $>,
					inferDefinition<c, $>,
					inferDefinition<d, $>,
					inferDefinition<e, $>,
					inferDefinition<f, $>,
					inferDefinition<g, $>,
					inferDefinition<h, $>,
					inferDefinition<i, $>,
					inferDefinition<j, $>,
					inferDefinition<k, $>,
					inferDefinition<l, $>,
					inferDefinition<m, $>,
					inferDefinition<n, $>,
					inferDefinition<o, $>,
					inferDefinition<p, $>,
					inferDefinition<q, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>,
		q: type.validate<q, $>
	): r extends infer _ ? _ : never
	<
		const defs extends readonly unknown[],
		r = Type<
			inferNaryIntersection<{ [i in keyof defs]: inferDefinition<defs[i], $> }>,
			$
		>
	>(
		...defs: { [i in keyof defs]: type.validate<defs[i], $> }
	): r extends infer _ ? _ : never
}

export type NaryMergeParser<$> = {
	(): Type<object, $>
	<const a, inferredA = inferDefinition<a, $>, r = Type<inferredA, $>>(
		a: type.validate<a, $> &
			// if you can figure out a way to avoid inlining this without
			// breaking autocomplete and error display, do it!
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		r = Type<merge<inferredA, inferredB>, $>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		r = Type<inferNaryMerge<[inferredA, inferredB, inferredC]>, $>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		r = Type<inferNaryMerge<[inferredA, inferredB, inferredC, inferredD]>, $>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		r = Type<
			inferNaryMerge<[inferredA, inferredB, inferredC, inferredD, inferredE]>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		r = Type<
			inferNaryMerge<
				[inferredA, inferredB, inferredC, inferredD, inferredE, inferredF]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		inferredJ = inferDefinition<j, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredJ]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		inferredJ = inferDefinition<j, $>,
		inferredK = inferDefinition<k, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredK]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		inferredJ = inferDefinition<j, $>,
		inferredK = inferDefinition<k, $>,
		inferredL = inferDefinition<l, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredL]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		inferredJ = inferDefinition<j, $>,
		inferredK = inferDefinition<k, $>,
		inferredL = inferDefinition<l, $>,
		inferredM = inferDefinition<m, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredM]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		inferredJ = inferDefinition<j, $>,
		inferredK = inferDefinition<k, $>,
		inferredL = inferDefinition<l, $>,
		inferredM = inferDefinition<m, $>,
		inferredN = inferDefinition<n, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM,
					inferredN
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredM]>),
		n: type.validate<n, $> &
			(inferredN extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredN]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		inferredJ = inferDefinition<j, $>,
		inferredK = inferDefinition<k, $>,
		inferredL = inferDefinition<l, $>,
		inferredM = inferDefinition<m, $>,
		inferredN = inferDefinition<n, $>,
		inferredO = inferDefinition<o, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM,
					inferredN,
					inferredO
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredM]>),
		n: type.validate<n, $> &
			(inferredN extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredN]>),
		o: type.validate<o, $> &
			(inferredO extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredO]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		inferredJ = inferDefinition<j, $>,
		inferredK = inferDefinition<k, $>,
		inferredL = inferDefinition<l, $>,
		inferredM = inferDefinition<m, $>,
		inferredN = inferDefinition<n, $>,
		inferredO = inferDefinition<o, $>,
		inferredP = inferDefinition<p, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM,
					inferredN,
					inferredO,
					inferredP
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredM]>),
		n: type.validate<n, $> &
			(inferredN extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredN]>),
		o: type.validate<o, $> &
			(inferredO extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredO]>),
		p: type.validate<p, $> &
			(inferredP extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredP]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		const q,
		inferredA = inferDefinition<a, $>,
		inferredB = inferDefinition<b, $>,
		inferredC = inferDefinition<c, $>,
		inferredD = inferDefinition<d, $>,
		inferredE = inferDefinition<e, $>,
		inferredF = inferDefinition<f, $>,
		inferredG = inferDefinition<g, $>,
		inferredH = inferDefinition<h, $>,
		inferredI = inferDefinition<i, $>,
		inferredJ = inferDefinition<j, $>,
		inferredK = inferDefinition<k, $>,
		inferredL = inferDefinition<l, $>,
		inferredM = inferDefinition<m, $>,
		inferredN = inferDefinition<n, $>,
		inferredO = inferDefinition<o, $>,
		inferredP = inferDefinition<p, $>,
		inferredQ = inferDefinition<q, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM,
					inferredN,
					inferredO,
					inferredP,
					inferredQ
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredM]>),
		n: type.validate<n, $> &
			(inferredN extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredN]>),
		o: type.validate<o, $> &
			(inferredO extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredO]>),
		p: type.validate<p, $> &
			(inferredP extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredP]>),
		q: type.validate<q, $> &
			(inferredQ extends object ? unknown
			:	ErrorType<[NonObjectMergeErrorMessage, actual: inferredQ]>)
	): r extends infer _ ? _ : never
	<
		const defs extends readonly unknown[],
		r = Type<
			inferNaryMerge<{ [i in keyof defs]: inferDefinition<defs[i], $> }>,
			$
		>
	>(
		...defs: {
			[i in keyof defs]: type.validate<defs[i], $> &
				(inferDefinition<defs[i], $> extends object ? unknown
				:	ErrorType<
						[NonObjectMergeErrorMessage, actual: inferDefinition<defs[i], $>]
					>)
		}
	): r extends infer _ ? _ : never
}

export type NaryPipeParser<$, initial = unknown> = {
	(): Type<initial, $>
	<
		a extends Morph<distill.Out<initial>>,
		r = instantiateType<inferMorph<initial, a>, $>
	>(
		a: a
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b]>, $>
	>(
		a: a,
		b: b
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c]>, $>
	>(
		a: a,
		b: b,
		c: c
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c, d]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c, d, e]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c, d, e, f]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j, k]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		n extends Morph<inferMorphOut<m>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m, n]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m,
		n: n
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		n extends Morph<inferMorphOut<m>>,
		o extends Morph<inferMorphOut<n>>,
		r = instantiateType<
			inferNaryPipe<
				[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o]
			>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m,
		n: n,
		o: o
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		n extends Morph<inferMorphOut<m>>,
		o extends Morph<inferMorphOut<n>>,
		p extends Morph<inferMorphOut<o>>,
		r = instantiateType<
			inferNaryPipe<
				[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]
			>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m,
		n: n,
		o: o,
		p: p
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		n extends Morph<inferMorphOut<m>>,
		o extends Morph<inferMorphOut<n>>,
		p extends Morph<inferMorphOut<o>>,
		q extends Morph<inferMorphOut<p>>,
		r = instantiateType<
			inferNaryPipe<
				[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q]
			>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m,
		n: n,
		o: o,
		p: p,
		q: q
	): r extends infer _ ? _ : never

	<
		a extends Morph<distill.Out<initial>>,
		aOut,
		b extends Morph<Exclude<aOut, ArkError | ArkErrors>>,
		const morphs extends readonly [
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			Morph,
			...Morph[]
		],
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, ...morphs]>, $>
	>(
		a: a & Morph<distill.Out<initial>, aOut>,
		b: b & Morph<Exclude<aOut, ArkError | ArkErrors>>,
		...defs: expectedPipeDefs<morphs, inferMorphOut<b>>
	): r extends infer _ ? _ : never
	<const morphs extends readonly Morph[], r = Type<inferNaryPipe<morphs>, $>>(
		...defs: expectedPipeDefs<morphs, distill.Out<initial>>
	): r extends infer _ ? _ : never
}

// Keep the full tuple in a separate type parameter (`all`) so TypeScript's
// homomorphic mapping over variadic tuples does not replace `morphs` with each
// rest slice inside `expectedPipeMorphAt`.
type expectedPipeDefs<
	morphs extends readonly Morph[],
	initialOut,
	all extends readonly Morph[] = morphs
> = {
	[i in keyof morphs]: morphs[i] & expectedPipeMorphAt<all, i, initialOut>
}

type expectedPipeMorphAt<morphs extends readonly Morph[], i, initialOut> =
	number extends i ? expectedVariadicRestMorph<morphs, initialOut>
	: i extends "0" ? Morph<initialOut>
	: i extends keyof (readonly [unknown, ...morphs]) ?
		(readonly [unknown, ...morphs])[i] extends infer prev extends Morph ?
			Morph<inferMorphOut<prev>>
		:	Morph
	:	Morph

type expectedVariadicRestMorph<morphs extends readonly Morph[], prevOut> =
	morphs extends (
		readonly [infer head extends Morph, ...infer tail extends readonly Morph[]]
	) ?
		expectedVariadicRestMorph<tail, inferMorphOut<head>>
	: morphs extends readonly [...infer init extends readonly Morph[], Morph] ?
		expectedVariadicRestMorph<init, prevOut>
	: [Morph.In<morphs[number]>] extends [never] ? Morph
	: Morph<prevOut | inferMorphOut<morphs[number]>>
