
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const EmployeePerformanceChart = () => {
  const data = [
    {
      month: 'Jan',
      avgRating: 4.1,
      resolutionRate: 78,
      responseTime: 3.2
    },
    {
      month: 'Feb',
      avgRating: 4.2,
      resolutionRate: 81,
      responseTime: 2.9
    },
    {
      month: 'Mar',
      avgRating: 4.0,
      resolutionRate: 79,
      responseTime: 3.1
    },
    {
      month: 'Apr',
      avgRating: 4.3,
      resolutionRate: 85,
      responseTime: 2.6
    },
    {
      month: 'May',
      avgRating: 4.2,
      resolutionRate: 83,
      responseTime: 2.4
    }
  ];

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="avgRating" 
            stroke="#3B82F6" 
            strokeWidth={3}
            name="Avg Rating"
          />
          <Line 
            type="monotone" 
            dataKey="resolutionRate" 
            stroke="#10B981" 
            strokeWidth={3}
            name="Resolution Rate (%)"
          />
          <Line 
            type="monotone" 
            dataKey="responseTime" 
            stroke="#F59E0B" 
            strokeWidth={3}
            name="Response Time (hrs)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EmployeePerformanceChart;
