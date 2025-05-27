
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
        <div className="text-gray-500">No approved issues found in the database</div>
      </div>
    );
  }

  const getBarColor = (index: number) => {
    const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#84CC16'];
    return colors[index % colors.length];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">
            <span className="font-medium">Count:</span> {payload[0].value}
          </p>
          {data.category && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Category:</span> {data.category}
            </p>
          )}
          {data.description && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Description:</span> {data.description.length > 100 ? `${data.description.substring(0, 100)}...` : data.description}
            </p>
          )}
        </div>
      );
    }
    return null;
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
            width={150}
          />
          <Tooltip content={<CustomTooltip />} />
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
