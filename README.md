# TypescriptMigration
A typesafe bidirectional migration facilitator

```ts
// Consider the following object structure we desire
type MyObjectType = {
  MyNiceString: string
  MyNiceNumber: number
  MyNiceBoolean: boolean
}
const MyObject: MyObjectType = {
  MyNiceString: 'Test',
  MyNiceNumber: 10,
  MyNiceBoolean: false,
}

// Given a less-desireable object structure
type OtherUglyObjectType = {
  my_ugly_object: string,
  my_ugly_boolean: boolean,
}
const OtherUglyObject: OtherUglyObjectType = {
  my_ugly_object: 'Test_10',
  my_ugly_boolean: false,
}

// Design a migration
const MyMigration = CompileMigration(
  MyObject, OtherUglyObject,
  ({left, right}) => ({
    // Bidirectional 1-1
    [left.MyNiceBoolean]: right.my_ugly_boolean,
    // Unidirectional left -> right
    [left.MyNiceString]: (right: OtherUglyObjectType) => right.my_ugly_object.split('_')[0],
    [left.MyNiceNumber]: (right: OtherUglyObjectType) => Number(right.my_ugly_object.split('_')[1]),
    // Unidirectional right -> left
    [right.my_ugly_object]: (left: MyObjectType) => left.MyNiceString + '_' + left.MyNiceNumber,
  })
)

assert.deepEqual(
  MyMigration.forward(MyObject),
  OtherUglyObject
)

assert.deepEqual(
  MyMigration.reverse(OtherUglyObject),
  MyObject
)

// Any new object of MyObjectType or OtherUglyObjectType will always be convertable two and from
```
