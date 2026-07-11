'use client';
import { CrudPage } from '@/components/ui/CrudPage';

export default function AttendancePage() {
  return (
    <CrudPage 
      title="Attendance Management"
      endpoint="/attendances"
      tableColumns={[
        { key: 'id', label: 'ID' },
        { key: 'user', label: 'Employee', render: (row: any) => row.user?.name || row.user_id },
        { key: 'date', label: 'Date' },
        { key: 'check_in', label: 'Check In' },
        { key: 'check_out', label: 'Check Out' },
        { key: 'status', label: 'Status' }
      ]}
      formFields={[
        { key: 'user_id', label: 'User ID', type: 'number' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'check_in', label: 'Check In', type: 'time', step: '1' },
        { key: 'check_out', label: 'Check Out', type: 'time', step: '1' },
        { 
          key: 'status', 
          label: 'Status', 
          options: [
            {value: 'Present', label: 'Present'}, 
            {value: 'Absent', label: 'Absent'}, 
            {value: 'Late', label: 'Late'}, 
            {value: 'Half Day', label: 'Half Day'}
          ] 
        }
      ]}
      defaultValues={{ user_id: '', date: '', check_in: '', check_out: '', status: 'Present' }}
      addLabel="+ Add Record"
    />
  );
}
