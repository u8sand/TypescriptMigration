import {strict as assert} from 'assert'
import { CompileMigration } from '.'

describe('test migration', () => {
  describe('case 1', () => {
    class Left {
      a: string = undefined
      b: number = undefined
      c: boolean = undefined
      d: string = undefined
    }

    class Right {
      e: boolean = undefined
      f: number = undefined
      g: string = undefined
      h: string = undefined
    }

    const migration = CompileMigration(
      new Left(), new Right(),
      ({left, right}) => ({
        [left.a]: right.g,
        [left.b]: right.f,
        [left.c]: right.e,
        [left.d]: (right: Right) => right.e + ':' + right.g,
        [right.h]: (left: Left) => left.d.split(':')[0],
      })
    )

    it('forward works', function() {
      assert.deepEqual(
        migration.forward({
          a: 'hello',
          b: 10,
          c: false,
          d: 'hello: world',
        }),
        {
          e: false,
          f: 10,
          g: 'hello',
          h: 'hello',
        }
      )
    })

    it('reverse works', function() {
      assert.deepEqual(
        migration.reverse({
          e: false,
          f: 10,
          g: 'hello',
          h: 'world',
        }),
        {
          a: 'hello',
          b: 10,
          c: false,
          d: 'false:hello',
        }
      )
    })
  })
  describe('example case', () => {
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
        [left.MyNiceBoolean]: right.my_ugly_boolean,
        [left.MyNiceString]: (right: OtherUglyObjectType) => right.my_ugly_object.split('_')[0],
        [left.MyNiceNumber]: (right: OtherUglyObjectType) => Number(right.my_ugly_object.split('_')[1]),
        [right.my_ugly_object]: (left: MyObjectType) => left.MyNiceString + '_' + left.MyNiceNumber,
      })
    )

    it('forward works', () => {
      assert.deepEqual(
        MyMigration.forward(MyObject),
        OtherUglyObject
      )
    })

    it('reverse works', () => {
      assert.deepEqual(
        MyMigration.reverse(OtherUglyObject),
        MyObject
      )
    })
  })
})
