import {strict as assert} from 'assert'
import { CompileMigration } from '.'

describe('test migration', function() {
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
      [left.d]: (obj: Right) => obj.e + ':' + obj.g,
      [right.h]: (obj: Left) => obj.d.split(':')[0],
    })
  )

  describe('forward', function() {
    it('works', function() {
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
  })
  describe('reverse', function() {
    it('works', function() {
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
})