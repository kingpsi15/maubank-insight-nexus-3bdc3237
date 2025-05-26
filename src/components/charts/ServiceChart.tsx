
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ServiceChart = () => {
  const data = [
    {
      service: 'ATM',
      positive: 645,
      negative: 234,
      total: 879
    },
    {
      service: 'Online Banking',
      positive: 823,
      negative: 445,
      total: 1268
    },
    {
      service: 'Core Banking',
      positive: 379,
      negative: 213,
      total: 592
    }
  ];

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="service" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="positive" fill="#10B981" name="Positive" />
          <Bar dataKey="negative" fill="#EF4444" name="Negative" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ServiceChart;
