import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export const Table = ({ columns, data, onEdit, onDelete }: any) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className="table table-zebra w-full">
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
            data.map((row: any) => (
              <tr key={row.id} className="hover">
                {columns.map((col: any) => (
                  <td key={col.key} className="text-sm">
                    {col.render 
                      ? col.render(row)
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