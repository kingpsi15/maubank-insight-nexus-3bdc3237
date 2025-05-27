
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

const IssuesChart = () => {
  const { issuesData, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500">Loading issues data...</div>
      </div>
    );
  }

  if (!issuesData || issuesData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500">No issues data available</div>
      </div>
    );
  }

  const getBarColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];
    return colors[index % colors.length];
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={issuesData} 
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
            formatter={(value: any) => [value, 'Occurrences']}
          />
          <Bar dataKey="count">
            {issuesData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IssuesChart;
