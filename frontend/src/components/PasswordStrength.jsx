import React from 'react'

function calcForca(senha) {
  if (!senha) return 0
  let score = 0
  if (senha.length >= 8)  score++
  if (senha.length >= 12) score++
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) score++
  if (/\d/.test(senha))             score++
  if (/[^a-zA-Z0-9]/.test(senha))  score++
  return score
}

const NIVEIS = [
  { label: '',             bar: 'bg-gray-200',    text: 'text-gray-400'     },
  { label: 'Muito fraca',  bar: 'bg-red-500',     text: 'text-red-600'      },
  { label: 'Fraca',        bar: 'bg-orange-400',  text: 'text-orange-600'   },
  { label: 'Média',        bar: 'bg-yellow-400',  text: 'text-yellow-600'   },
  { label: 'Forte',        bar: 'bg-green-500',   text: 'text-green-600'    },
  { label: 'Muito forte',  bar: 'bg-emerald-600', text: 'text-emerald-700'  },
]

export default function PasswordStrength({ senha }) {
  if (!senha) return null
  const score = calcForca(senha)
  const nivel = NIVEIS[score]
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(b => (
          <div
            key={b}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${b <= score ? nivel.bar : 'bg-gray-200'}`}
          />
        ))}
      </div>
      {nivel.label && (
        <p className={`text-xs font-medium ${nivel.text}`}>{nivel.label}</p>
      )}
    </div>
  )
}
