import React from 'react'

const STATUS_MAP = {
  na_fila:    { label: 'Na fila',    className: 'bg-yellow-100 text-yellow-800' },
  na_empresa: { label: 'Na empresa', className: 'bg-green-100 text-green-800' },
  saiu:       { label: 'Saiu',       className: 'bg-gray-100 text-gray-600' },
  cancelado:  { label: 'Cancelado',  className: 'bg-red-100 text-red-700' },
}

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status, className: 'bg-yellow-100 text-yellow-800' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${info.className}`}>
      {info.label}
    </span>
  )
}
