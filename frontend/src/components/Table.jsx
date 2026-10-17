// src/components/Table.jsx
import React from 'react';

export default function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.accessor}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.Header}
              </th>
            ))}
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              className="hover:bg-gray-100 cursor-pointer"
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {col.Cell ? col.Cell(row) : row[col.accessor]}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {/* placeholder for actions */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
