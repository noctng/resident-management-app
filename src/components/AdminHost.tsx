import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import type {
  Apartment,
  Resident,
  Occupancy,
  UtilityRecord,
  AmenityUsage,
  AmenityType,
  User,
  AmenityBookingData,
  Feedback,
  ActivityLog,
  Permission,
} from '../types';
import ApartmentDetail from './ApartmentDetail';
import ResidentDetail from './ResidentDetail';
import AddApartmentModal from './AddApartmentModal';
import AddResidentModal from './AddResidentModal';
import {
  AppLogo,
  UserIcon,
  TicketIcon,
  UsersIcon,
  BoltIcon,
  Cog6ToothIcon,
  KeyIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  DocumentArrowDownIcon,
} from './icons';
import AddUtilityRecordModal from './AddUtilityRecordModal';
import EditResidentModal from './EditResidentModal';
import EditApartmentModal from './EditApartmentModal';
import ListView from './ListView';
import ChangeUserPasswordModal from './ChangeUserPasswordModal';
import DashboardStats from './DashboardStats';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const AmenityPage = lazy(() => import('../pages/AmenityPage'));
const UserManagementPage = lazy(() => import('../pages/UserManagementPage'));
const UtilityPage = lazy(() => import('../pages/UtilityPage'));
const UnifiedBillingPage = lazy(() => import('../pages/UnifiedBillingPage'));
const ConfigurationPage = lazy(() => import('../pages/ConfigurationPage'));
const ResidentAccountsPage = lazy(() => import('../pages/ResidentAccountsPage'));
const FeedbackManagementPage = lazy(() => import('../pages/FeedbackManagementPage'));
const ActivityLogPage = lazy(() => import('../pages/ActivityLogPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ApartmentsPage = lazy(() => import('../pages/ApartmentsPage'));
const ResidentsPage = lazy(() => import('../pages/ResidentsPage'));

const CrmDashboardPage = lazy(() => import('../pages/crm/CrmDashboardPage'));
const SalesMatrixPage = lazy(() => import('../pages/crm/SalesMatrixPage'));
const ProductInventoryPage = lazy(() => import('../pages/crm/ProductInventoryPage'));
const LeadKanbanPage = lazy(() => import('../pages/crm/LeadKanbanPage'));
const CartAndBookingPage = lazy(() => import('../pages/crm/CartAndBookingPage'));
const DepositListPage = lazy(() => import('../pages/crm/DepositListPage'));
const HandoverManagementPage = lazy(() => import('../pages/crm/HandoverManagementPage'));
const CustomerListPage = lazy(() => import('../pages/crm/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('../pages/crm/CustomerDetailPage'));
const ContractDetailPage = lazy(() => import('../pages/crm/ContractDetailPage'));
const OverduePaymentsPage = lazy(() => import('../pages/crm/OverduePaymentsPage'));
const ApprovalQueuePage = lazy(() => import('../pages/crm/ApprovalQueuePage'));
const RevenueReportPage = lazy(() => import('../pages/crm/RevenueReportPage'));
const ContractListPage = lazy(() => import('../pages/crm/ContractListPage'));
const PricingPolicyPage = lazy(() => import('../pages/crm/PricingPolicyPage'));
const CommissionPage = lazy(() => import('../pages/crm/CommissionPage'));
const PropertyTransferPage = lazy(() => import('../pages/crm/PropertyTransferPage'));
const ContractDocumentHubPage = lazy(() => import('../pages/crm/ContractDocumentHubPage'));
const WarrantyManagementPage = lazy(() => import('../pages/operations/WarrantyManagementPage'));
const ConstructionFitoutPage = lazy(() => import('../pages/operations/ConstructionFitoutPage'));
const ExecutiveAnalyticsHubPage = lazy(() => import('../pages/crm/ExecutiveAnalyticsHubPage'));

const FeeConfigPage = lazy(() => import('../pages/FeeConfigPage'));
const ManagementFeePage = lazy(() => import('../pages/ManagementFeePage'));
const DebtDashboardPage = lazy(() => import('../pages/DebtDashboardPage'));
const VehicleManagementPage = lazy(() => import('../pages/VehicleManagementPage'));
const TechnicianMeterPage = lazy(() => import('../pages/TechnicianMeterPage'));
const NewsManagementPage = lazy(() => import('../pages/NewsManagementPage'));
import AdminLayout from './layout/AdminLayout';
import { FullscreenLoader } from './ui/LoadingSpinner';
import { useToast, useConfirm } from './ui';

function AdminHost() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [utilityRecords, setUtilityRecords] = useState<UtilityRecord[]>([]);
  const [amenityUsages, setAmenityUsages] = useState<AmenityUsage[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]); // New state
  const [isAmenityListLoading, setIsAmenityListLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { confirm } = useConfirm();
  // const [adminSubView, setAdminSubView] = useState... removed
  const [selectedItem, setSelectedItem] = useState<{
    type: 'apartment' | 'resident';
    id: string;
  } | null>(null);

  // Derive current view from location for backward compatibility with permission logic and highlighting
  const currentView = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';

  const [isAddApartmentModalOpen, setAddApartmentModalOpen] = useState(false);
  const [isAddResidentModalOpen, setAddResidentModalOpen] = useState(false);
  const [isAddUtilityRecordModalOpen, setAddUtilityRecordModalOpen] = useState(false);
  const [utilityModalTarget, setUtilityModalTarget] = useState<Apartment | null>(null);
  const [isEditResidentModalOpen, setEditResidentModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<Resident | null>(null);
  const [isEditApartmentModalOpen, setEditApartmentModalOpen] = useState(false);
  const [isChangeUserPasswordModalOpen, setChangeUserPasswordModalOpen] = useState(false);

  // Helper function to log activity
  const logActivity = async (
    action: ActivityLog['action'],
    targetType: ActivityLog['targetType'],
    details: string,
    targetName?: string,
    targetId?: string,
    oldData?: any,
    newData?: any
  ) => {
    if (!currentUser) return;

    let finalDetails = details;
    if (oldData || newData) {
      try {
        finalDetails = JSON.stringify({
          message: details,
          oldData,
          newData,
        });
      } catch (e) {
        console.error('Failed to stringify log details', e);
      }
    }

    // Optimistic update
    const tempLog: ActivityLog = {
      id: `LOG_TEMP_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action,
      targetType,
      targetId,
      targetName,
      details: finalDetails,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [tempLog, ...prev]);

    try {
      await api.post('/activity-logs', {
        action,
        targetType,
        targetId,
        targetName,
        details: finalDetails,
      });
    } catch (error) {
      console.error('Failed to save activity log', error);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await api.get<{ user: User; userType: string }>('/auth/session');
        if (data && data.userType === 'admin') {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setAuthChecked(true);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const isAdmin = currentUser.role === 0;

        const endpoints: {
          name: string;
          url: string;
          adminOnly: boolean;
          permission?: Permission;
        }[] = [
          {
            name: 'apartments',
            url: '/api/apartments',
            adminOnly: false,
            permission: 'apartments',
          },
          { name: 'residents', url: '/api/residents', adminOnly: false, permission: 'residents' },
          {
            name: 'occupancies',
            url: '/api/occupancies',
            adminOnly: true,
            permission: 'residents',
          },
          {
            name: 'utilityRecords',
            url: '/api/utility-records',
            adminOnly: true,
            permission: 'utilities',
          },
          {
            name: 'amenityUsages',
            url: '/api/amenity-usage',
            adminOnly: false,
            permission: 'amenities',
          },
          { name: 'feedback', url: '/api/feedback', adminOnly: false, permission: 'feedback' },
          { name: 'logs', url: '/api/activity-logs', adminOnly: true, permission: 'logs' },
        ];

        const checkEndpointPerm = (e: { permission?: Permission; adminOnly?: boolean }) => {
          if (isAdmin) return true;
          if (!e.adminOnly && !e.permission) return true;
          if (e.permission && currentUser.permissions?.includes(e.permission)) return true;
          if (
            (e.permission === 'utilities' || e.permission === 'apartments') &&
            currentUser.permissions?.includes('meter_reading')
          ) {
            return true;
          }
          return false;
        };

        const promises = endpoints
          .filter(checkEndpointPerm)
          .map(async (e) => {
            try {
              return await api.get(e.url.replace('/api', '')); // api service adds /api base
            } catch (err) {
              console.error(`Error fetching ${e.name}:`, err);
              if (e.name === 'logs') {
                toast.error(
                  'Không thể kết nối đến máy chủ để lấy lịch sử hoạt động. Vui lòng kiểm tra xem server backend đã được khởi động lại chưa.'
                );
              }
              return [];
            }
          });

        const results = await Promise.all(promises);

        const data: any = {};
        const filteredEndpoints = endpoints.filter(checkEndpointPerm);
        filteredEndpoints.forEach((e, i) => {
          data[e.name] = results[i];
        });

        console.log('Fetched Activity Logs:', data.logs);

        setApartments(data.apartments || []);
        setResidents(data.residents || []);
        setOccupancies(data.occupancies || []);
        setUtilityRecords(data.utilityRecords || []);
        setAmenityUsages(data.amenityUsages || []);
        setFeedback(data.feedback || []);
        setActivityLogs(Array.isArray(data.logs) ? data.logs : []); // Ensure it's an array

        if (data.apartments?.length > 0) {
          setSelectedItem((prev) => prev ?? { type: 'apartment', id: data.apartments[0].id });
        }

        if (!isAdmin) {
          const hasPerm = (p: Permission) => currentUser.permissions?.includes(p);
          const viewOrder: { view: string; perm: Permission }[] = [
            { view: 'dashboard', perm: 'dashboard' },
            { view: 'meter-recorder', perm: 'meter_reading' },
            { view: 'apartments', perm: 'apartments' },
            { view: 'residents', perm: 'residents' },
            { view: 'utilities', perm: 'utilities' },
            { view: 'amenities', perm: 'amenities' },
            { view: 'feedback', perm: 'feedback' },
            { view: 'resident_accounts', perm: 'resident_accounts' },
            { view: 'users', perm: 'users' },
            { view: 'configuration', perm: 'configuration' },
            { view: 'logs', perm: 'logs' },
            { view: 'crm', perm: 'crm' },
          ];
          const firstAllowed = viewOrder.find((v) => hasPerm(v.perm))?.view || 'dashboard';
          if (location.pathname === '/' || location.pathname === '/admin') {
            navigate('/admin/' + firstAllowed);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Không thể tải dữ liệu từ máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleRefetchAmenityUsages = async () => {
    setIsAmenityListLoading(true);
    try {
      const newUsages = await api.get<AmenityUsage[]>('/amenity-usage');
      setAmenityUsages(newUsages);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsAmenityListLoading(false);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Don't log login here as we might not have the user state fully set yet or it's just setting state
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setCurrentUser(null);
      navigate('/admin/dashboard');
    }
  };

  const handleOpenAddUtilityModal = (apartment: Apartment) => {
    setUtilityModalTarget(apartment);
    setAddUtilityRecordModalOpen(true);
  };

  const handleAddApartment = async (aptData: Omit<Apartment, 'id'>) => {
    try {
      const newApartment = await api.post<Apartment>('/apartments', aptData);
      setApartments([...apartments, newApartment].sort((a, b) => a.code.localeCompare(b.code)));
      logActivity(
        'CREATE',
        'APARTMENT',
        `Thêm căn hộ mới ${newApartment.code}`,
        newApartment.code,
        newApartment.id
      );
    } catch (error) {
      console.error(error);
      toast.error('Thêm căn hộ thất bại.');
    }
  };

  const handleUpdateApartment = async (aptId: string, aptData: Omit<Apartment, 'id'>) => {
    try {
      const updatedApartment = await api.put<Apartment>(`/apartments/${aptId}`, aptData);
      setApartments(
        apartments
          .map((apt) => (apt.id === aptId ? updatedApartment : apt))
          .sort((a, b) => a.code.localeCompare(b.code))
      );
      logActivity(
        'UPDATE',
        'APARTMENT',
        `Cập nhật thông tin căn hộ ${updatedApartment.code}`,
        updatedApartment.code,
        aptId
      );
    } catch (error) {
      console.error(error);
      toast.error('Cập nhật căn hộ thất bại.');
    }
  };

  const handleAddResident = async (resData: Omit<Resident, 'id'>) => {
    try {
      const newResident = await api.post<Resident>('/residents', resData);
      setResidents([...residents, newResident].sort((a, b) => a.name.localeCompare(b.name)));
      logActivity(
        'CREATE',
        'RESIDENT',
        `Thêm cư dân mới ${newResident.name}`,
        newResident.name,
        newResident.id
      );
    } catch (error) {
      console.error(error);
      toast.error('Thêm cư dân thất bại.');
    }
  };

  const handleUpdateResident = async (
    resId: string,
    resData: Omit<Resident, 'id' | 'isActive' | 'canUseAmenities'>
  ) => {
    const oldResident = residents.find((r) => r.id === resId);
    try {
      const updatedResident = await api.put<Resident>(`/residents/${resId}`, resData);
      setResidents(
        residents
          .map((res) => (res.id === resId ? updatedResident : res))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      logActivity(
        'UPDATE',
        'RESIDENT',
        `Cập nhật thông tin cư dân ${updatedResident.name}`,
        updatedResident.name,
        resId,
        oldResident,
        updatedResident
      );
    } catch (error: any) {
      console.error(error);
      toast.error(`Lỗi: ${error.message}`);
    }
  };

  const handleUpdateResidentStatus = async (residentId: string, isActive: boolean) => {
    try {
      const updatedStatus = await api.put<{ id: string; is_active: boolean }>(
        `/residents/${residentId}/status`,
        { isActive }
      );
      setResidents(
        residents.map((res) =>
          res.id === updatedStatus.id ? { ...res, isActive: updatedStatus.is_active } : res
        )
      );

      const resName = residents.find((r) => r.id === residentId)?.name;
      logActivity(
        'UPDATE',
        'RESIDENT',
        `${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} cư dân ${resName}`,
        resName,
        residentId
      );
    } catch (error) {
      console.error(error);
      toast.error('Cập nhật trạng thái cư dân thất bại.');
    }
  };

  const handleUpdateAmenityAccess = async (residentId: string, canUseAmenities: boolean) => {
    // Store original state for potential rollback
    const originalResidents = residents;

    // Optimistically update the UI
    const newResidents = residents.map((res) =>
      res.id === residentId ? { ...res, canUseAmenities } : res
    );
    setResidents(newResidents);

    try {
      await api.put(`/residents/${residentId}/amenity-access`, { canUseAmenities });

      const resName = residents.find((r) => r.id === residentId)?.name;
      logActivity(
        'UPDATE',
        'RESIDENT',
        `${canUseAmenities ? 'Cấp quyền' : 'Hủy quyền'} sử dụng tiện ích cho ${resName}`,
        resName,
        residentId
      );
    } catch (error) {
      console.error(error);
      // If there was an error, revert the state to what it was before the optimistic update
      setResidents(originalResidents);
      toast.error('Cập nhật quyền sử dụng tiện ích thất bại.');
    }
  };

  const handleDeleteResident = async (residentId: string) => {
    try {
      await api.delete(`/residents/${residentId}`);
      const resName = residents.find((r) => r.id === residentId)?.name || '';
      logActivity('DELETE', 'RESIDENT', `Xóa cư dân ${resName}`, resName, residentId);
      setResidents((prev) => prev.filter((r) => r.id !== residentId));
      setOccupancies((prev) => prev.filter((o) => o.residentId !== residentId));
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  };

  const handleAddOccupancy = async (apartmentId: string, residentId: string) => {
    try {
      await api.post('/occupancies', { apartmentId, residentId });
      setOccupancies([...occupancies, { apartmentId, residentId }]);

      const apt = apartments.find((a) => a.id === apartmentId);
      const res = residents.find((r) => r.id === residentId);
      logActivity(
        'UPDATE',
        'APARTMENT',
        `Thêm cư dân ${res?.name} vào căn hộ ${apt?.code}`,
        apt?.code,
        apartmentId
      );
    } catch (error) {
      console.error(error);
      toast.error('Thêm cư dân vào căn hộ thất bại.');
    }
  };

  const handleRemoveOccupancy = async (apartmentId: string, residentId: string) => {
    if (
      !(await confirm({
        title: 'Xóa cư dân khỏi căn hộ',
        description: 'Bạn có chắc chắn muốn xóa cư dân này khỏi căn hộ không?',
        variant: 'danger',
      }))
    )
      return;
    try {
      await api.delete(`/occupancies/${apartmentId}/${residentId}`);
      setOccupancies(
        occupancies.filter((o) => !(o.apartmentId === apartmentId && o.residentId === residentId))
      );

      const apt = apartments.find((a) => a.id === apartmentId);
      const res = residents.find((r) => r.id === residentId);
      logActivity(
        'UPDATE',
        'APARTMENT',
        `Xóa cư dân ${res?.name} khỏi căn hộ ${apt?.code}`,
        apt?.code,
        apartmentId
      );
    } catch (error) {
      console.error(error);
      toast.error('Xóa cư dân khỏi căn hộ thất bại.');
    }
  };

  const handleAddUtilityRecord = async (data: {
    apartmentId: string;
    month: number;
    year: number;
    newElectricityReading: number;
    newWaterReading: number;
  }) => {
    try {
      const newRecord = await api.post<UtilityRecord>('/utility-records', data);
      setUtilityRecords([...utilityRecords, newRecord]);
    } catch (error) {
      console.error(error);
      toast.error('Thêm bản ghi điện nước thất bại.');
    }
  };

  const handleAddAmenityUsage = async (
    apartmentId: string,
    amenity: AmenityType,
    bookingData: AmenityBookingData,
    residentId?: string
  ): Promise<AmenityUsage> => {
    try {
      const newUsage = await api.post<AmenityUsage>('/amenity-usage', {
        apartmentId,
        amenity,
        ...bookingData,
        residentId,
      });
      setAmenityUsages((prev) =>
        [...prev, newUsage].sort(
          (a, b) => new Date(b.usageDate).getTime() - new Date(a.usageDate).getTime()
        )
      );
      return newUsage;
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  };

  const handleUpdateAmenityStatus = async (usageId: string, status: 'USED' | 'CANCELLED') => {
    try {
      const updatedUsage = await api.put<AmenityUsage>(`/amenity-usage/${usageId}/status`, {
        status,
      });
      setAmenityUsages((prevUsages) =>
        prevUsages.map((u) => (u.id === usageId ? updatedUsage : u))
      );
    } catch (error) {
      console.error(error);
      toast.error('Cập nhật trạng thái đặt chỗ thất bại.');
    }
  };

  const handleUpdateAmenityBooking = async (
    usageId: string,
    data: Partial<AmenityBookingData & { amenity: AmenityType; status: string }>
  ): Promise<AmenityUsage> => {
    try {
      const updatedUsage = await api.put<AmenityUsage>(`/amenity-usage/${usageId}`, data);
      setAmenityUsages((prevUsages) =>
        prevUsages.map((u) => (u.id === usageId ? updatedUsage : u))
      );
      return updatedUsage;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleDeleteAmenityBooking = async (usageId: string): Promise<void> => {
    try {
      await api.delete(`/amenity-usage/${usageId}`);
      setAmenityUsages((prevUsages) => prevUsages.filter((u) => u.id !== usageId));
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleResolveFeedback = async (feedbackId: string, formData: FormData) => {
    if (!currentUser) throw new Error('User not authenticated');
    try {
      const updatedFeedback = await api.upload<Feedback>(
        `/feedback/${feedbackId}/resolve`,
        formData,
        'PUT'
      );
      setFeedback((prev) => prev.map((f) => (f.id === feedbackId ? updatedFeedback : f)));
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message || 'Phản hồi thất bại.');
    }
  };

  const apartmentOccupancyStatus = useMemo(() => {
    const occupiedIds = new Set(occupancies.map((o) => o.apartmentId));
    return apartments.reduce(
      (acc, apt) => {
        acc[apt.id] = occupiedIds.has(apt.id);
        return acc;
      },
      {} as Record<string, boolean>
    );
  }, [apartments, occupancies]);

  const selectedApartment = useMemo(() => {
    if (selectedItem?.type === 'apartment') {
      return apartments.find((apt) => apt.id === selectedItem.id) || null;
    }
    return null;
  }, [selectedItem, apartments]);

  const selectedResident = useMemo(() => {
    if (selectedItem?.type === 'resident') {
      return residents.find((res) => res.id === selectedItem.id) || null;
    }
    return null;
  }, [selectedItem, residents]);

  const residentsInApartment = useMemo(() => {
    if (!selectedApartment) return [];
    const residentIds = occupancies
      .filter((o) => o.apartmentId === selectedApartment.id)
      .map((o) => o.residentId);
    return residents.filter((r) => residentIds.includes(r.id));
  }, [selectedApartment, occupancies, residents]);

  const apartmentsOfResident = useMemo(() => {
    if (!selectedResident) return [];
    const apartmentIds = occupancies
      .filter((o) => o.residentId === selectedResident.id)
      .map((o) => o.apartmentId);
    return apartments.filter((apt) => apartmentIds.includes(apt.id));
  }, [selectedResident, occupancies, apartments]);

  const utilityRecordsForApartment = useMemo(() => {
    if (!selectedApartment) return [];
    return utilityRecords
      .filter((r) => r.apartmentId === selectedApartment.id)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [selectedApartment, utilityRecords]);

  const isAdmin = currentUser?.role === 0;

  // Permission checking function
  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 0) return true; // Admin has all permissions
    return currentUser.permissions?.includes(permission) || false;
  };

  // Permission checking (Refactored for Router)
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 0) return; // Admin has full access

    const viewPermissionMap: Record<string, Permission> = {
      dashboard: 'dashboard',
      apartments: 'apartments',
      residents: 'residents',
      utilities: 'utilities',
      'unified-billing': 'unified_billing',
      amenities: 'amenities',
      feedback: 'feedback',
      resident_accounts: 'resident_accounts',
      users: 'users',
      configuration: 'configuration',
      logs: 'logs',
      crm: 'crm',
      announcements: 'announcements',
    };

    const requiredPermission = viewPermissionMap[currentView];

    if (requiredPermission && !hasPermission(requiredPermission)) {
      // Find first available permission to redirect to
      const availableView = Object.keys(viewPermissionMap).find((view) =>
        hasPermission(viewPermissionMap[view]!)
      );

      if (availableView) {
        navigate('/admin/' + availableView);
      }
    }
  }, [currentView, currentUser, navigate]);

  if (!authChecked) {
    return <FullscreenLoader label="Đang kiểm tra phiên đăng nhập..." />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (loading) {
    return <FullscreenLoader label="Đang tải dữ liệu..." />;
  }

  // Unified Admin/Manager View
  return (
    <>
      <AdminLayout
        currentUser={currentUser}
        onLogout={handleLogout}
        onChangePassword={() => setChangeUserPasswordModalOpen(true)}
      >
        <Suspense fallback={<FullscreenLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" replace />} />

            <Route
              path="dashboard"
              element={
                <DashboardPage
                  apartments={apartments}
                  residents={residents}
                  amenityUsages={amenityUsages}
                  occupancies={occupancies}
                  feedback={feedback}
                  onNavigate={(view) => navigate('/admin/' + view)}
                />
              }
            />

            <Route
              path="apartments"
              element={
                <ApartmentsPage
                  apartments={apartments}
                  residents={residents}
                  occupancies={occupancies}
                  onAddApartment={() => setAddApartmentModalOpen(true)}
                  onEditApartment={(apt) => {
                    setSelectedItem({ type: 'apartment', id: apt.id });
                    setEditApartmentModalOpen(true);
                  }}
                  onViewApartment={(apt) => {
                    setSelectedItem({ type: 'apartment', id: apt.id });
                  }}
                  onAddResidentToApartment={handleAddOccupancy}
                  onRemoveResidentFromApartment={handleRemoveOccupancy}
                  onEditResident={(res) => {
                    setResidentToEdit(res);
                    setEditResidentModalOpen(true);
                  }}
                  onNavigate={(view: string) => navigate('/admin/' + view)}
                />
              }
            />

            <Route
              path="residents"
              element={
                <ResidentsPage
                  residents={residents}
                  apartments={apartments}
                  occupancies={occupancies}
                  onAddResident={() => setAddResidentModalOpen(true)}
                  onEditResident={(res) => {
                    setResidentToEdit(res);
                    setEditResidentModalOpen(true);
                  }}
                  onViewResident={(res) => {
                    setSelectedItem({ type: 'resident', id: res.id });
                  }}
                  onAddApartmentToResident={handleAddOccupancy}
                  onRemoveApartmentFromResident={handleRemoveOccupancy}
                  onUpdateResidentStatus={handleUpdateResidentStatus}
                  onUpdateAmenityAccess={handleUpdateAmenityAccess}
                  isAdmin={isAdmin}
                  onDeleteResident={handleDeleteResident}
                />
              }
            />

            <Route
              path="amenities"
              element={
                <AmenityPage
                  apartments={apartments}
                  amenityUsages={amenityUsages}
                  onAddAmenityUsage={handleAddAmenityUsage}
                  onUpdateAmenityStatus={handleUpdateAmenityStatus}
                  onUpdateAmenityBooking={handleUpdateAmenityBooking}
                  onDeleteAmenityBooking={handleDeleteAmenityBooking}
                  onBack={() => navigate('/admin/dashboard')}
                  onRefetchAmenityUsages={handleRefetchAmenityUsages}
                  isAmenityListLoading={isAmenityListLoading}
                  isManagerView={true}
                />
              }
            />

            <Route
              path="vehicles"
              element={
                <VehicleManagementPage
                  apartments={apartments}
                  onBack={() => navigate('/admin/dashboard')}
                />
              }
            />

            <Route
              path="utilities"
              element={
                <UtilityPage
                  apartments={apartments}
                  utilityRecords={utilityRecords}
                  onAddRecord={handleAddUtilityRecord}
                  onOpenAddUtilityModal={handleOpenAddUtilityModal}
                  onBack={() => navigate('/admin/dashboard')}
                />
              }
            />

            <Route
              path="meter-recorder"
              element={
                <TechnicianMeterPage
                  apartments={apartments}
                  utilityRecords={utilityRecords}
                  currentUser={currentUser}
                  onRefreshData={async () => {
                    try {
                      const records = await api.get<UtilityRecord[]>('/utility-records');
                      setUtilityRecords(records || []);
                    } catch (e) {
                      console.error('Failed to refetch utility records', e);
                    }
                  }}
                  onBack={() => navigate('/admin/dashboard')}
                />
              }
            />

            <Route
              path="unified-billing"
              element={
                <UnifiedBillingPage
                  onBack={() => navigate('/admin/dashboard')}
                  apartments={apartments}
                  onOpenAddUtilityModal={handleOpenAddUtilityModal}
                />
              }
            />

            <Route
              path="users"
              element={
                <UserManagementPage
                  onBack={() => navigate('/admin/dashboard')}
                  currentUser={currentUser}
                />
              }
            />

            <Route
              path="resident_accounts"
              element={
                <ResidentAccountsPage
                  onBack={() => navigate(isAdmin ? '/admin/dashboard' : '/admin/amenities')}
                />
              }
            />

            <Route
              path="configuration"
              element={
                <ConfigurationPage
                  onBack={() => navigate('/admin/dashboard')}
                  currentUser={currentUser}
                />
              }
            />

            <Route
              path="feedback"
              element={
                <FeedbackManagementPage
                  feedbackList={feedback}
                  onResolveFeedback={handleResolveFeedback}
                  onBack={() => navigate('/admin/dashboard')}
                />
              }
            />

            {/* CRM Routes */}
            <Route
              path="crm"
              element={
                <CrmDashboardPage onNavigate={(view: string) => navigate('/admin/' + view)} />
              }
            />
            <Route
              path="crm/sales-matrix"
              element={<SalesMatrixPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/inventory"
              element={<ProductInventoryPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/pricing-policy"
              element={<PricingPolicyPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/products"
              element={<ProductInventoryPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/leads"
              element={<LeadKanbanPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/bookings"
              element={<CartAndBookingPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/deposits"
              element={<DepositListPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/documents"
              element={<ContractDocumentHubPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/transfers"
              element={<PropertyTransferPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/commissions"
              element={<CommissionPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/handover"
              element={<HandoverManagementPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/customers"
              element={
                <CustomerListPage
                  onBack={() => navigate('/admin/crm')}
                  onNavigate={(view: string) => navigate('/admin/' + view)}
                  onViewCustomer={(c) => navigate(`/admin/crm/customers/${c.id}`)}
                />
              }
            />
            <Route
              path="crm/customers/:id"
              element={
                <CustomerDetailPage
                  onBack={() => navigate('/admin/crm/customers')}
                  onNavigate={(view: string) => navigate('/admin/' + view)}
                />
              }
            />
            <Route
              path="crm/contracts/:id"
              element={
                <ContractDetailPage
                  onBack={() => navigate(-1)}
                  onNavigate={(view: string) => navigate('/admin/' + view)}
                />
              }
            />
            <Route
              path="crm/overdue-payments"
              element={
                <OverduePaymentsPage
                  onBack={() => navigate('/admin/crm')}
                  onNavigate={(view: string) => navigate('/admin/' + view)}
                />
              }
            />
            <Route
              path="crm/contracts"
              element={
                <ContractListPage
                  onBack={() => navigate('/admin/crm')}
                  onNavigate={(view: string) => navigate('/admin/' + view)}
                  onViewContract={(c) => navigate(`/admin/crm/contracts/${c.id}`)}
                />
              }
            />
            <Route
              path="crm/analytics"
              element={<ExecutiveAnalyticsHubPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="reports/executive"
              element={<ExecutiveAnalyticsHubPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="crm/revenue-report"
              element={<ExecutiveAnalyticsHubPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />

            {/* Operations: Warranty (B.8.4/C.8) & Construction/Fit-out (C.9) */}
            <Route
              path="operations/warranty"
              element={<WarrantyManagementPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="warranty"
              element={<WarrantyManagementPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="operations/construction"
              element={<ConstructionFitoutPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />
            <Route
              path="construction"
              element={<ConstructionFitoutPage onNavigate={(view: string) => navigate('/admin/' + view)} />}
            />

            {/* Management Fees Routes */}
            <Route path="management-fees" element={<ManagementFeePage />} />
            <Route path="fee-config" element={<FeeConfigPage />} />
            <Route path="debt-dashboard" element={<DebtDashboardPage />} />

            <Route
              path="logs"
              element={
                <ActivityLogPage logs={activityLogs} onBack={() => navigate('/admin/dashboard')} />
              }
            />

            <Route
              path="announcements"
              element={<NewsManagementPage />}
            />

            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Suspense>
      </AdminLayout>

      <AddApartmentModal
        isOpen={isAddApartmentModalOpen}
        onClose={() => setAddApartmentModalOpen(false)}
        onAddApartment={handleAddApartment}
      />
      <AddResidentModal
        isOpen={isAddResidentModalOpen}
        onClose={() => setAddResidentModalOpen(false)}
        onAddResident={handleAddResident}
      />
      <AddUtilityRecordModal
        isOpen={isAddUtilityRecordModalOpen}
        onClose={() => setAddUtilityRecordModalOpen(false)}
        onAddRecord={handleAddUtilityRecord}
        apartment={utilityModalTarget}
        latestRecord={
          utilityModalTarget
            ? utilityRecords
                .filter((r) => r.apartmentId === utilityModalTarget.id)
                .sort((a, b) => b.year - a.year || b.month - a.month)[0] || null
            : null
        }
      />
      <EditResidentModal
        isOpen={isEditResidentModalOpen}
        onClose={() => setEditResidentModalOpen(false)}
        onUpdateResident={handleUpdateResident}
        resident={residentToEdit}
      />
      <EditApartmentModal
        isOpen={isEditApartmentModalOpen}
        onClose={() => setEditApartmentModalOpen(false)}
        onUpdateApartment={handleUpdateApartment}
        apartment={selectedApartment}
      />
      <ChangeUserPasswordModal
        isOpen={isChangeUserPasswordModalOpen}
        onClose={() => setChangeUserPasswordModalOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
}

export default AdminHost;
