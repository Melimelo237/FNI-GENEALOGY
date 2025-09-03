// ===================================
// src/components/common/StatCard.jsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, change, period, icon: Icon, color = 'blue' }) => {
  const isPositive = change && change.startsWith('+');
  const isNegative = change && change.startsWith('-');

  const colorClasses = {
    blue: 'bg-fni-blue-50 text-fni-blue-600',
    green: 'bg-fni-green-50 text-fni-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        {change && (
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            isPositive ? 'bg-green-100 text-green-800' : 
            isNegative ? 'bg-red-100 text-red-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {change}
          </span>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-sm font-medium text-gray-700">{title}</p>
        {period && (
          <p className="text-xs text-gray-500 mt-1">{period}</p>
        )}
      </div>
      
      {change && (
        <div className="flex items-center mt-2 text-xs">
          {isPositive && <TrendingUp className="h-3 w-3 text-green-600 mr-1" />}
          {isNegative && <TrendingDown className="h-3 w-3 text-red-600 mr-1" />}
          <span className="text-gray-600">par rapport à la période précédente</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
