
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

const IssuesChart = () => {
  const { issuesData, isLoading } = useAnalytics();

  console.log('IssuesChart - issuesData:', issuesData);
  console.log('IssuesChart - isLoading:', isLoading);

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500">Loading issues data...</div>
      </div>
    );
  }

  if (!issuesData || issuesData.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center space-y-2">
        <div className="text-gray-500">No approved issues found in the database</div>
        <div className="text-sm text-gray-400">
          Issues need to be approved and have feedback counts to appear here
        </div>
      </div>
    );
  }

  // Calculate total feedback across all issues
  const totalFeedback = issuesData.reduce((sum, issue) => sum + (issue.count || 0), 0);
  const totalIssues = issuesData.length;

  const getBarColor = (index: number) => {
    const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#84CC16'];
    return colors[index % colors.length];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalFeedback > 0 ? ((data.count / totalFeedback) * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              <span className="font-medium">Feedback Count:</span> {payload[0].value}
            </p>
            <p className="text-sm text-green-600">
              <span className="font-medium">Frequency:</span> {percentage}% of total
            </p>
            {data.category && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Category:</span> {data.category}
              </p>
            )}
            {data.description && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium">Description:</span> 
                <br />
                {data.description.length > 100 ? `${data.description.substring(0, 100)}...` : data.description}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalIssues}</div>
          <div className="text-sm text-gray-600">Total Issues</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalFeedback}</div>
          <div className="text-sm text-gray-600">Total Feedback</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {totalIssues > 0 ? (totalFeedback / totalIssues).toFixed(1) : '0'}
          </div>
          <div className="text-sm text-gray-600">Avg per Issue</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {issuesData[0]?.count || 0}
          </div>
          <div className="text-sm text-gray-600">Most Frequent</div>
        </div>
      </div>

      {/* Chart */}
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

      {/* Issues List with Frequencies */}
      <div className="mt-4">
        <h4 className="text-lg font-semibold mb-3">Issue Frequency Breakdown</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {issuesData.map((issue, index) => {
            const percentage = totalFeedback > 0 ? ((issue.count / totalFeedback) * 100).toFixed(1) : 0;
            return (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{issue.issue}</p>
                  <p className="text-xs text-gray-500">{issue.category}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-blue-600">{issue.count}</span>
                  <span className="text-xs text-gray-500">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IssuesChart;
