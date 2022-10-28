import { useEffect } from 'react'

export default function useForcePopup(itemId, ref, params, setParams, done) {
  useEffect(() => {
    if (params.id === itemId && ref?.current[itemId] && done) {
      ref.current[itemId].openPopup()
      // setParams(({ id, ...rest }) => rest)
    }
  }, [done])
}
