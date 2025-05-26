
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const IssuesChart = () => {
  const data = [
    { issue: 'ATM Card Stuck', count: 89, service: 'ATM' },
    { issue: 'Login Failed', count: 67, service: 'Online Banking' },
    { issue: 'Transaction Delay', count: 56, service: 'Core Banking' },
    { issue: 'Cash Not Dispensed', count: 45, service: 'ATM' },
    { issue: 'App Crashes', count: 43, service: 'Online Banking' },
    { issue: 'Balance Mismatch', count: 38, service: 'Core Banking' },
    { issue: 'Receipt Not Printed', count: 34, service: 'ATM' },
    { issue: 'Page Timeout', count: 29, service: 'Online Banking' }
  ];

  const getBarColor = (service: string) => {
    switch (service) {
      case 'ATM': return '#3B82F6';
      case 'Online Banking': return '#10B981';
      case 'Core Banking': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          layout="horizontal"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis 
            type="category"
            dataKey="issue" 
            tick={{ fontSize: 10 }}
            width={120}
          />
          <Tooltip 
            formatter={(value: any, name: any, props: any) => [
              value, 
              `Occurrences (${props.payload.service})`
            ]}
          />
          <Bar dataKey="count" fill="#3B82F6">
            {data.map((entry, index) => (
              <Bar key={`bar-${index}`} fill={getBarColor(entry.service)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IssuesChart;
