import { BuildingOfficeIcon, UsersIcon } from './icons';

interface DashboardStatsProps {
  totalApartments: number;
  totalResidents: number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ totalApartments, totalResidents }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="bg-surface border border-brand-border rounded-lg shadow p-4 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-brand-teal-soft text-brand-teal">
          <BuildingOfficeIcon className="w-8 h-8" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-soft">Tổng số căn hộ</p>
          <p className="text-2xl font-bold text-ink">{totalApartments}</p>
        </div>
      </div>

      <div className="bg-surface border border-brand-border rounded-lg shadow p-4 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-brand-success-soft text-brand-success">
          <UsersIcon className="w-8 h-8" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-soft">Tổng số cư dân</p>
          <p className="text-2xl font-bold text-ink">{totalResidents}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
