# arkregex

## 0.0.4

### consecutive `${bigint}`s are no longer collapsed

```ts
// was: Regex<`${bigint}`>
// now: Regex<`${bigint}${bigint}`>
regex("^\\d\\d$")
```

Though the new representation will be longer for some expressions, it is required to correctly allow a zero-prefix like `"01"` in this case.

## 0.0.3

### fix quantifier behavior for non-natural numbers

```ts
// the following expressions now result in:
// TypeScript: Quantifier {bad-quantifier} must use natural numbers

// leading zeroes
regex("^a{002}$")
// negative quantifier
regex("^a{-1}$")
// non-integer quantifier
regex("^a{1.5}$")
// with whitespace
regex("^a{ 1}$"))
```

🙌(thanks @codpro2005)

## 0.0.1

initial release 🎉
