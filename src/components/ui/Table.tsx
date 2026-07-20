import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const getStatusBadge = (status: any) => {
  if (typeof status !== 'string') return String(status);
  const s = status.toLowerCase();
  if (['present', 'approved', 'paid', 'active', 'completed', 'delivered', 'ready', 'success', 'true'].includes(s)) {
    return <span className="badge badge-success text-white font-medium px-3 py-1 h-auto rounded-full">{status}</span>;
  }
  if (['pending', 'in progress', 'late', 'processing', 'preparing', 'half day', 'scheduled', 'draft'].includes(s)) {
    return <span className="badge badge-warning font-medium px-3 py-1 h-auto rounded-full">{status}</span>;
  }
  if (['absent', 'rejected', 'failed', 'cancelled', 'inactive', 'false'].includes(s)) {
    return <span className="badge badge-error text-white font-medium px-3 py-1 h-auto rounded-full">{status}</span>;
  }
  return <span className="badge badge-ghost px-3 py-1 h-auto rounded-full">{status}</span>;
};

export const Table = ({ columns, data, onEdit, onDelete, rowClassName }: any) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className={`table w-full ${rowClassName ? '' : 'table-zebra'}`}>
        <thead>
          <tr>
            {columns.map((col: any) => (
              <th key={col.key} className="text-xs uppercase text-base-content/60 font-semibold">
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="text-xs uppercase text-base-content/60 font-semibold">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="text-center py-10 text-base-content/40">
                No data found.
              </td>
            </tr>
          ) : (
            data.map((row: any, index: number) => (
              <tr key={row.id || `row-${index}`} className={`hover ${rowClassName ? rowClassName(row) : ''}`}>
                {columns.map((col: any) => (
                  <td key={col.key} className="text-sm">
                    {col.render 
                      ? col.render(row)
                      : (col.key === 'status' || col.key === 'payment_status' || col.key === 'delivery_status') && row[col.key] !== null && row[col.key] !== undefined
                        ? getStatusBadge(row[col.key])
                        : row[col.key] !== null && row[col.key] !== undefined
                          ? String(row[col.key])
                          : <span className="text-base-content/30">—</span>}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td>
                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="btn btn-xs btn-ghost btn-square text-info tooltip"
                          data-tip="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="btn btn-xs btn-ghost btn-square text-error tooltip"
                          data-tip="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};