import { formatGameDate } from '../api/gameDate.js'
import { useCurrentDay } from '../api/currentDay.js'

export default function DateCalc() {
  const [current, setCurrent] = useCurrentDay()
  const formatted = current != null ? formatGameDate(current) : ''

  return (
    <div className="max-w-xl mx-auto mt-10 bg-slate-800 rounded-xl p-8">
      <h2 className="text-2xl font-bold mb-6">📅 Calendrier du Manoir</h2>
      <label className="block text-sm text-slate-400 mb-2">Jour courant (Days XX)</label>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-slate-400">Days</span>
        <input
          type="number"
          min="1"
          value={current ?? ''}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            setCurrent(!n || n < 1 ? null : n)
          }}
          className="w-32 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-lg"
        />
      </div>
      <div className="bg-slate-900 rounded-lg p-6 text-center">
        <div className="text-sm text-slate-500 mb-1">Date en jeu</div>
        <div className="text-2xl font-semibold capitalize text-cyan-300">
          {formatted || '—'}
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4">Days 01 = 7 novembre 1993 (premier vrai jour). Modifier ce numéro change le jour de run courant, synchronisé avec la vue Jour.</p>
    </div>
  )
}
