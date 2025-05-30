import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

interface MySqlSentimentChartProps {
  filters?: any;
}

const MySqlSentimentChart: React.FC<MySqlSentimentChartProps> = ({ filters = {} }) => {
  const { sentimentData, isLoading } = useAnalytics(filters);

  // Define a default color palette that matches our new theme
  const colorPalette = {
    'Positive': 'hsl(180, 50%, 45%)',  // Primary teal
    'Negative': 'hsl(0, 70%, 60%)',     // Soft red
    'Neutral': 'hsl(210, 20%, 70%)'     // Muted gray-blue
  };

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500">Loading sentiment data...</div>
      </div>
    );
  }

  if (!sentimentData || sentimentData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500">No sentiment data available</div>
      </div>
    );
  }

  // Filter out neutral sentiment as requested
  const filteredData = sentimentData.filter(item => item.name !== 'Neutral');
  
  // Ensure all data points have colors from our palette
  const dataWithColors = filteredData.map(item => ({
    ...item,
    fill: colorPalette[item.name as keyof typeof colorPalette] || item.fill || 'hsl(210, 20%, 70%)'
  }));

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithColors}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {dataWithColors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [value, 'Feedback Count']}
            contentStyle={{ backgroundColor: 'hsl(210, 30%, 97%)', borderColor: 'hsl(214, 20%, 91%)' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MySqlSentimentChart;
