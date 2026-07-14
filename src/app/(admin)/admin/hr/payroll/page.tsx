'use client';
import { CrudPage } from '@/components/ui/CrudPage';

export default function PayrollPage() {
  return (
    <CrudPage 
      title="Payroll Management"
      endpoint="/payrolls"
      tableColumns={[
        { key: 'id', label: 'ID' },
        { key: 'user', label: 'Employee', render: (row: any) => row.user?.name || row.user_id },
        { key: 'month', label: 'Month' },
        { key: 'year', label: 'Year' },
        { key: 'net_pay', label: 'Net Pay' },
        { key: 'status', label: 'Status' }
      ]}
      formFields={[
        { key: 'user_id', label: 'User ID', type: 'number' },
        { 
          key: 'month', 
          label: 'Month', 
          options: [
            {value: 'January', label: 'January'}, {value: 'February', label: 'February'}, 
            {value: 'March', label: 'March'}, {value: 'April', label: 'April'}, 
            {value: 'May', label: 'May'}, {value: 'June', label: 'June'}, 
            {value: 'July', label: 'July'}, {value: 'August', label: 'August'}, 
            {value: 'September', label: 'September'}, {value: 'October', label: 'October'}, 
            {value: 'November', label: 'November'}, {value: 'December', label: 'December'}
          ] 
        },
        { key: 'year', label: 'Year', type: 'number' },
        { key: 'basic_salary', label: 'Basic Salary', type: 'number', step: '0.01' },
        { key: 'bonus', label: 'Bonus', type: 'number', step: '0.01' },
        { key: 'overtime_pay', label: 'Overtime Pay', type: 'number', step: '0.01' },
        { key: 'deductions', label: 'Deductions', type: 'number', step: '0.01' },
        { 
          key: 'status', 
          label: 'Status', 
          options: [
            {value: 'Pending', label: 'Pending'}, 
            {value: 'Paid', label: 'Paid'}
          ] 
        }
      ]}
      defaultValues={{ 
        user_id: '', 
        month: 'January', 
        year: new Date().getFullYear().toString(), 
        basic_salary: '0', 
        bonus: '0', 
        overtime_pay: '0', 
        deductions: '0', 
        status: 'Pending' 
      }}
      addLabel="+ New Payroll"
    />
  );
}
