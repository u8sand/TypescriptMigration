/**
 * We try hard to preserve type information throughout the conversion to enable type-safe migrations~
 */

type Object = {[k: string]: unknown}
type KeysOf<T extends Object> = keyof T
type LabelsOf<T extends Object> = {
  [key in KeysOf<T>]: key
}
type Migration<Left, Right> = {
  left: Partial<{
    [key in KeysOf<Left>]: keyof LabelsOf<Right> | ((obj: Right) => Left[key])
  }>
  right: Partial<{
    [key in KeysOf<Right>]: keyof LabelsOf<Left> | ((obj: Left) => Right[key])
  }>
}

type CompleteMigration<Left, Right> = {
  left: {
    [key in KeysOf<Left>]: ((obj: Right) => Left[key])
  }
  right: {
    [key in KeysOf<Right>]: ((obj: Left) => Right[key])
  }
}

type CompiledMigration<Left, Right> = {
  forward: (obj: Left) => Right,
  reverse: (obj: Right) => Left,
}

function Labeler<
  Obj extends Object,
>(
  obj: Obj
): LabelsOf<Obj> {
  return Object.keys(obj).reduce((labeler, key: KeysOf<Obj>) => {
    labeler[key] = key
    return labeler
  }, {} as LabelsOf<Obj>)
}

export function CompileMigration<Left extends Object, Right extends Object>(
  Left: Left,
  Right: Right,
  m_func: (_: {
    left: LabelsOf<Left>,
    right:  LabelsOf<Right>,
  }) => Migration<Left, Right>
): CompiledMigration<Left, Right> {
  const M_partial = m_func({
    left: Labeler(Left),
    right: Labeler(Right),
  })

  let M_complete: CompleteMigration<Left, Right> = {
    left: {} as any,
    right: {} as any,
  }

  for(const left_k of Object.keys(M_partial.left)) {
    if(typeof M_partial.left[left_k] === 'function') {
      M_complete.left[left_k] = M_partial.left[left_k] as (right: Right) => Left
    } else {
      const right_k: KeysOf<Right> = M_partial.left[left_k] as string;
      const left_k_resolved = left_k.slice(left_k.indexOf('.')+1)
      const right_k_resolved = (right_k as string).slice((right_k as string).indexOf('.')+1)
      M_complete.left[left_k] = (right: Right) => right[right_k_resolved]
      M_complete.right[right_k] = (left: Left) => left[left_k_resolved]
    }
  }

  for(const right_k of Object.keys(M_partial.right)) {
    if(typeof M_partial.right[right_k] === 'function') {
      M_complete.right[right_k] = M_partial.right[right_k] as (left: Left) => Right
    } else {
      const left_k: KeysOf<Left> = M_partial.right[right_k] as string;
      const right_k_resolved = right_k.slice(right_k.indexOf('.')+1)
      const left_k_resolved = (left_k as string).slice((left_k as string).indexOf('.')+1)
      M_complete.right[right_k] = (left: Left) => left[left_k_resolved]
      M_complete.left[left_k] = (right: Right) => right[right_k_resolved]
    }
  }

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
