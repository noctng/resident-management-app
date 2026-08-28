import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  period: string;
  revenue: number;
  paid: number;
}

interface Props {
  data: ChartData[];
}

const RevenueChart: React.FC<Props> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return (value / 1000000).toFixed(1) + ' tr';
  };

  const formatTooltipValue = (value: number | undefined) => {
    if (value === undefined) return '';
    return value.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
        <XAxis dataKey="period" stroke="#7f8c8d" style={{ fontSize: '12px' }} />
        <YAxis stroke="#7f8c8d" style={{ fontSize: '12px' }} tickFormatter={formatCurrency} />
        <Tooltip
          formatter={formatTooltipValue}
          contentStyle={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#3498db"
          strokeWidth={3}
          name="Doanh thu"
          dot={{ fill: '#3498db', r: 5 }}
          activeDot={{ r: 7 }}
        />
        <Line
          type="monotone"
          dataKey="paid"
          stroke="#27ae60"
          strokeWidth={3}
          name="Đã thu"
          dot={{ fill: '#27ae60', r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
