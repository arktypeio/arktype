# arkregex

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
