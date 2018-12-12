/**
 * We try hard to preserve type information throughout the conversion to enable type-safe migrations~
 */

/**
 * A valid object has a string key
 */
type Object = {[k: string]: unknown}

/**
 * Any of the keys of a given valid object
 */
type KeysOf<T extends Object> = keyof T

/**
 * A type-safe labeler of a given valid object (key: key for every key)
 */
type LabelsOf<T extends Object> = {
  // ***This is actually a lie--the key is prefix + key, but using key
  //  here helps typescript identify say what like is what
  [key in KeysOf<T>]: key
}

/**
 * A Partial migration specification converting from an object Left to an object Right
 *  left and right are separated because typescript doesn't support multiple index definitions.
 * A migration value can either be a key to the other object or a function which does the conversion.
 */
type PartialMigration<Left, Right> = (
  Partial<{
    [key in KeysOf<Left>]: keyof LabelsOf<Right> | ((obj: Right) => Left[key])
  }> & Partial<{
    [key in KeysOf<Right>]: keyof LabelsOf<Left> | ((obj: Left) => Right[key])
  }>
)

/**
 * A complete migration specification converting from an object Left to an object Right
 *  left and right are separated because typescript doesn't support multiple index definitions.
 * The left lookups are used for constructing a left object from a right object.
 * The right lookups are used for constructing a right object from a left object.
 */
type Migration<Left, Right> = {
  left: {
    [key in KeysOf<Left>]: ((obj: Right) => Left[key])
  }
  right: {
    [key in KeysOf<Right>]: ((obj: Left) => Right[key])
  }
}

/**
 * A compiled migration, mapping any given object Left to and from another object Right.
 *  .forward converts Left to Right
 *  .reverse converts Right to Left
 */
type CompiledMigration<Left, Right> = {
  forward: (obj: Left) => Right,
  reverse: (obj: Right) => Left,
}

/**
 * A labeler which converts an abitrary object Object with string keys
 *  into a prefixed key->{prefix}.key object.
 * e.g. {a: .., b: ..} => {a: '{prefix}.a', b: '{prefix}.b'}
 */
function Labeler<
  Obj extends Object
>(
  obj: Obj,
  prefix: string
): LabelsOf<Obj> {
  return Object.keys(obj).reduce((labeler, key: KeysOf<Obj>) => {
    labeler[key] = prefix + '.' + key
    return labeler
  }, {} as LabelsOf<Obj>)
}

/**
 * Resolve a label into the original key.
 */
function ResolveLabel<
  Obj extends Object
>(
  label: KeysOf<Obj>
): KeysOf<Obj> {
  return (label as string).slice((label as string).indexOf('.') + 1)
}

/**
 * Obtain all the keys of a given object which match a specific label prefix
 */
function LabelReducer<
  Obj extends Object
>(
  obj: Obj,
  prefix: string
): KeysOf<Obj>[] {
  return Object.keys(obj).reduce<KeysOf<Obj>[]>((labels, key: KeysOf<Obj>) => {
    if((key as string).indexOf(prefix+'.') === 0) {
      labels = [...labels, ResolveLabel(key)]
    }
    return labels
  }, [] as KeysOf<Obj>[])
}

/**
 * Compile a migration from a mapping function.
 * 
 * @param Left A complete instance of a Left object (for obtaining keys)
 * @param Right A complete instance of a Right object (for obtaining keys)
 * @param m_func A mapping function of the form
 *  ({left, right}) => ({
 *    left: {
 *      [left.prop_of_left]: right.prop_of_right,
 *      [left.prop_of_left]: (right) => convert_to_left_prop,
 *    },
 *    right: {
 *      [right.prop_of_right]: right.prop_of_left,
 *      [right.prop_of_right]: (left) => convert_to_right_prop,
 *    }
 *  })
 * 
 * Note that label mappings are bi-directional,
 *  so one need not specify the other side.
 */
export default function CompileMigration<Left extends Object, Right extends Object>(
  Left: Left,
  Right: Right,
  m_func: (_: {
    left: LabelsOf<Left>,
    right:  LabelsOf<Right>,
  }) => PartialMigration<Left, Right>
): CompiledMigration<Left, Right> {
  // Build PartialMigration
  const M_partial = m_func({
    left: Labeler(Left, 'left'),
    right: Labeler(Right, 'right'),
  })

  // Build Migration
  let M_complete: Migration<Left, Right> = {
    left: {} as any,
    right: {} as any,
  }

  // Process left keys
  for(const left_k of LabelReducer<Partial<Left>>(M_partial, 'left')) {
    if(typeof M_partial['left.' + left_k] === 'function') {
      M_complete.left[left_k] = M_partial['left.' + left_k] as (right: Right) => Left
    } else {
      const right_k = ResolveLabel(M_partial['left.' + left_k] as KeysOf<Right>)
      M_complete.left[left_k] = (right: Right) => right[right_k]
      M_complete.right[right_k] = (left: Left) => left[left_k]
    }
  }

  for(const right_k of LabelReducer<Partial<Right>>(M_partial, 'right')) {
    if(typeof M_partial['right.' + right_k] === 'function') {
      M_complete.right[right_k] = M_partial['right.' + right_k] as (right: Left) => Right
    } else {
      const left_k = ResolveLabel(M_partial['right.' + right_k] as KeysOf<Left>)
      M_complete.right[right_k] = (left: Left) => left[left_k]
      M_complete.left[left_k] = (right: Right) => right[right_k]
    }
  }

  // Build CompiledMigration
  return {
    forward: (left: Left): Right => {
      return Object.keys(M_complete.right).reduce<Right>((result, k: KeysOf<Right>) => {
        result[k] = M_complete.right[k](left)
        return result
      }, {} as Right)
    },
    reverse: (right: Right): Left => {
      return Object.keys(M_complete.left).reduce<Left>((result, k: KeysOf<Left>) => {
        result[k] = M_complete.left[k](right)
        return result
      }, {} as Left)
    },
  }
}
