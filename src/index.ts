/**
 * We try hard to preserve type information throughout the conversion to enable type-safe migrations~
 */

type Object = {
  [k: string]: unknown
}

type KeysOf<T extends Object> = keyof T & string
type EitherKey<Left, Right> = (keyof Left | keyof Right) & string
type LabelOf<Left, Right> = {
  [key in keyof Left]: keyof LabelOf<Right, Left>
}

type Migration<Left, Right> = Partial<{
  [key in KeysOf<LabelOf<Left, Right>>]: keyof LabelOf<Right, Right> | ((obj: Right) => Left[key])
}> & Partial<{
  [key in KeysOf<LabelOf<Right, Left>>]: keyof LabelOf<Left, Left> | ((obj: Left) => Right[key])
}>

type CompleteMigration<Left, Right> = {
  [key in KeysOf<LabelOf<Left, Right>>]: ((obj: Right) => Left[key])
} & {
  [key in KeysOf<LabelOf<Right, Left>>]: ((obj: Left) => Right[key])
}

type CompiledMigration<Left, Right> = {
  forward: (obj: Left) => Right,
  reverse: (obj: Right) => Left,
}

function Labeler<
  Left extends Object,
  Right extends Object
>(
  obj: Left,
  name: string
): LabelOf<Left, Right> {
  return Object.keys(obj).reduce<
    LabelOf<Left, Right>
  >(
    (labeler, key) => {
      labeler[key] = name + '.' + key
      return labeler
    },
    {} as LabelOf<Left, Right>
  )
}

export function CompileMigration<Left extends Object, Right extends Object>(
  Left: Left,
  Right: Right,
  m_func: (_: {
    left: LabelOf<Left, Right>,
    right:  LabelOf<Right, Left>,
  }) => Migration<Left, Right>
): CompiledMigration<Left, Right> {
  const M_partial = m_func({
    left: Labeler(Left, 'left'),
    right: Labeler(Right, 'right'),
  })

  const M_complete = Object.keys(M_partial).reduce(
    (M_complete, left_k: EitherKey<LabelOf<Left, Right>, LabelOf<Right, Left>>) => {
      // TODO: Fix these type-bindings to propagate migration function return values
      if(typeof M_partial[left_k] === 'function') {
        (M_complete[left_k] as any) = M_partial[left_k]
      } else {
        const right_k: KeysOf<LabelOf<Right, Left>> = M_partial[left_k] as string;
        const left_k_resolved = left_k.slice(left_k.indexOf('.')+1);
        const right_k_resolved = right_k.slice(right_k.indexOf('.')+1);
        (M_complete[left_k] as any) = (right: Right) => right[right_k_resolved];
        (M_complete[right_k] as any) = (left: Left) => left[left_k_resolved];
      }
      return M_complete
    }, {} as CompleteMigration<Left, Right>
  )

  return {
    forward: (left: Left): Right => {
      return Object.keys(M_complete).reduce<Right>((result, k: KeysOf<Left>) => {
        if(k.indexOf('right.') === 0) {
          const k_resolved = k.slice(k.indexOf('.')+1)
          result[k_resolved] = M_complete[k](left)
        }
        return result
      }, {} as Right)
    },
    reverse: (right: Right): Left => {
      return Object.keys(M_complete).reduce<Left>((result, k: KeysOf<Right>) => {
        if(k.indexOf('left.') === 0) {
          const k_resolved = k.slice(k.indexOf('.')+1)
          result[k_resolved] = M_complete[k](right)
        }
        return result
      }, {} as Left)
    },
  }
}
