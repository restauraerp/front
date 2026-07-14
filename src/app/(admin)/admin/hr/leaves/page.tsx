'use client';
import { CrudPage } from '@/components/ui/CrudPage';

export default function LeavesPage() {
  return (
    <CrudPage 
      title="Leaves Management"
      endpoint="/leaves"
      tableColumns={[
        { key: 'id', label: 'ID' },
        { key: 'user', label: 'Employee', render: (row: any) => row.user?.name || row.user_id },
        { key: 'start_date', label: 'Start Date' },
        { key: 'end_date', label: 'End Date' },
        { key: 'status', label: 'Status' }
      ]}
      formFields={[
        { key: 'user_id', label: 'User ID', type: 'number' },
        { 
          key: 'status', 
          label: 'Status', 
          options: [
            {value: 'Pending', label: 'Pending'}, 
            {value: 'Approved', label: 'Approved'}, 
            {value: 'Rejected', label: 'Rejected'}
          ] 
        },
        { key: 'start_date', label: 'Start Date', type: 'date' },
        { key: 'end_date', label: 'End Date', type: 'date' },
        { key: 'reason', label: 'Reason', textarea: true, colSpan: true }
      ]}
      defaultValues={{ user_id: '', start_date: '', end_date: '', reason: '', status: 'Pending' }}
      addLabel="+ New Request"
    />
  );
}
