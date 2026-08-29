import React from 'react';
import { StatCard } from './ui/Card';
import { BuildingOfficeIcon, UsersIcon } from './icons';

interface DashboardStatsProps {
  totalApartments: number;
  totalResidents: number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ totalApartments, totalResidents }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <StatCard
        label="Tổng số căn hộ"
        value={totalApartments}
        icon={BuildingOfficeIcon}
        iconBg="bg-brand-teal-soft"
        iconColor="text-brand-teal"
      />
      <StatCard
        label="Tổng số cư dân"
        value={totalResidents}
        icon={UsersIcon}
        iconBg="bg-brand-success-soft"
        iconColor="text-brand-success"
        variant="hero"
      />
    </div>
  );
};

export default DashboardStats;
