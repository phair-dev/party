import type { Couple } from './config'

export function CoupleLabel({ couple }: { couple: Couple }) {
  return (
    <>
      {couple.photoUrl ? (
        <img className="thumb" src={couple.photoUrl} alt="" />
      ) : (
        <div className="thumb thumb-empty">🎃</div>
      )}
      <span className="couple-text">
        <strong>{couple.lastName}</strong>
        <small>{couple.costume}</small>
      </span>
    </>
  )
}
