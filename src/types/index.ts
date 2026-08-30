export interface Resident {
  id: string;
  name: string;
  dob: string;
  idNumber: string;
  zaloId?: string;
  phoneNumber?: string;
  isActive: boolean;
  email?: string;
  relationshipStatus: 'OWNER' | 'FAMILY' | 'TENANT';
  canUseAmenities: boolean;
  companyName?: string;
  buyerName?: string;
  taxCode?: string;
  invoiceAddress?: string;
}

export interface Apartment {
  id: string;
  houseType: string;
  code: string;
  floor: number;
  area: number;
  electricityType: 'RESIDENTIAL' | 'BUSINESS';
  
  // CRM Standard Fields
  phase_code?: RealEstatePhase | string;
  phaseCode?: RealEstatePhase | string;
  block_code?: string;
  blockCode?: string;
  lot_number?: string;
  lotNumber?: string;
  
  // 4 Area Metrics
  land_area?: number;
  landArea?: number;
  construction_area?: number;
  constructionArea?: number;
  usable_area?: number;
  usableArea?: number;
  certificate_area?: number;
  certificateArea?: number;

  // Two-Component Pricing
  land_price_before_vat?: number;
  landPrice?: number;
  construction_price_before_vat?: number;
  constructionPrice?: number;
  vat_rate?: number;
  vatRate?: number;
  maintenance_fee_2pct?: number;
  maintenanceFee2pct?: number;
  subtotal?: number;
  vatAmount?: number;
  grand_total?: number;
  grandTotal?: number;

  // Specs & Status
  sales_status?: string;
  salesStatus?: string;
  direction?: string;
  view_description?: string;
  viewDescription?: string;
  bedroom_count?: number;
  bedroomCount?: number;
  bathroom_count?: number;
  bathroomCount?: number;

  // Associated Residents & Count
  residents?: {
    id: string;
    name: string;
    phoneNumber?: string;
    relationshipStatus?: string;
    email?: string;
    isActive?: boolean;
  }[];
  residentCount?: number;
  contracts?: any[];
}

export interface Occupancy {
  apartmentId: string;
  residentId: string;
}

export interface UtilityUsage {
  oldReading: number;
  newReading: number;
  consumption: number;
  cost: number;
  tax?: number;
}

export interface UtilityRecord {
  id: string;
  apartmentId: string;
  month: number;
  year: number;
  electricity: UtilityUsage;
  water: UtilityUsage;
  paymentStatus?: 'PAID' | 'UNPAID';
  paidDate?: string;
  emailSentAt?: string;
  pricingSnapshot?: PricingConfig | null;
}

export type AmenityType =
  | 'GOLF_3D'
  | 'HORSE_RIDING'
  | 'MUSEUM'
  | 'ZEN_GARDEN'
  | 'SAUNA'
  | 'ARCHERY'
  | 'GYM'
  | 'YOGA';

export interface AmenityUsage {
  id: string;
  apartmentId: string;
  amenity: AmenityType;
  usageDate: string; // YYYY-MM-DD string
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  bookingCode: string;
  status: 'PENDING' | 'USED' | 'CANCELLED';
  residentId?: string;
  residentName?: string;
}

export type VehicleType = 'CAR' | 'MOTORBIKE';

export interface Vehicle {
  id: string;
  apartmentId: string;
  vehicleType: VehicleType;
  licensePlate: string;
  createdAt?: string;
  updatedAt?: string;
  // Joined fields
  apartmentCode?: string;
  ownerName?: string;
  ownerPhone?: string;
}

export type Permission =
  | 'dashboard'
  | 'apartments'
  | 'residents'
  | 'utilities'
  | 'amenities'
  | 'feedback'
  | 'resident_accounts'
  | 'users'
  | 'configuration'
  | 'logs'
  | 'crm'
  | 'crm_approve'
  | 'unified_billing'
  | 'vehicles'
  | 'meter_reading'
  | 'announcements'
  | 'construction'
  | 'billing'
  | 'contracts'
  | 'pricebook'
  | 'leads'
  | 'deposits'
  | 'handover'
  | 'commission'
  | 'revenue';

// ===== RBAC (Blueprint A.4 + E.1) =====
// Action CRUDA: C=Tạo, R=Xem, U=Sửa, D=Xóa logic, A=Duyệt
export type PermAction = 'C' | 'R' | 'U' | 'D' | 'A';

export interface RoleInfo {
  code: string; // ADMIN, PMS-M, SALE, ...
  name: string;
  subsystem: 'ban_hang' | 'van_hanh' | 'chung';
}

export interface EffectivePermission {
  module: Permission;
  action: PermAction;
}

export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  address?: string;
  id_number?: string;
  notes?: string;
  created_at?: string;
}

export interface Contract {
  id: string;
  contract_code: string;
  customer_id: string;
  apartment_id: string;
  total_value: number;
  vat_amount: number;
  maintenance_fee: number;
  status: 'DEPOSIT' | 'SIGNED' | 'PAYING' | 'COMPLETED' | 'CANCELLED';
  signed_date?: string;
  handover_date?: string;
  created_at?: string;
  customers?: Customer;
  apartments?: Apartment;
}

export interface ContractPayment {
  id: string;
  contract_id: string;
  installment: number;
  description?: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  payment_date?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  document_name: string;
  file_url: string;
  doc_type?: string;
  uploaded_at?: string;
}

// --- NEW CRM PHASE 1 TYPES ---

export interface ContractLifecycleEvent {
  id: string;
  contract_id: string;
  event_type:
    | 'DEPOSIT'
    | 'SIGNED'
    | 'AMENDED'
    | 'TRANSFERRED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'HANDOVER';
  event_date: string;
  performed_by?: string;
  notes?: string;
  metadata?: any;
  created_at?: string;
}

export interface PaymentSchedule {
  id: string;
  contract_id: string;
  schedule_name?: string;
  policy_type?: 'MILESTONE_BASED' | 'TIME_BASED' | 'CUSTOM';
  late_fee_rate: number;
  grace_period_days: number;
  created_at?: string;
  created_by?: string;
}

export interface HandoverChecklistItem {
  id: string;
  contract_id: string;
  item_name: string;
  item_order: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  created_at?: string;
}

export interface ApprovalWorkflow {
  id: string;
  request_type: 'EXTENSION' | 'DISCOUNT' | 'TRANSFER' | 'CANCELLATION';
  contract_id?: string;
  requested_by: string;
  requested_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  request_data?: any;
  created_at?: string;
}

export interface ContractFinancialSummary {
  contract_id: string;
  contract_code: string;
  total_value: number;
  status: string;
  total_paid: number;
  total_scheduled: number;
  total_overdue: number;
  total_late_fees: number;
  payment_percentage: number;
  pending_payments: number;
  overdue_payments: number;
}

export interface User {
  id: string;
  username: string;
  role: 0 | 1; // 0 for Admin, 1 for Amenity Manager (legacy compat)
  permissions?: Permission[];
  // RBAC mở rộng (blueprint)
  roles?: RoleInfo[]; // danh sách vai trò (1 user nhiều vai trò)
  perms?: EffectivePermission[]; // ma trận module:action
}

// --- NEW TYPES FOR PRICING CONFIG ---
export interface PricingTier {
  limit: number | null; // null for the last tier (e.g., "above 400")
  rate: number;
}

export interface PricingConfig {
  residentialElectricity: PricingTier[];
  businessElectricity: {
    normalRate: number;
    offPeakRate: number;
    peakRate: number;
    averageRate: number;
  };
  water: {
    residentialRate: number;
    businessRate: number;
  };
  vat: {
    electricity: number;
    water: number;
  };
  n8nWebhookUrl?: string; // New field for n8n chat integration
}

export interface ResidentAccountInfo {
  id: string; // This is the resident's ID
  name: string;
  phoneNumber: string;
}

export interface PricingHistory {
  id: number;
  config_data: PricingConfig;
  changed_at: string;
  changed_by_username: string;
}

export type AmenityBookingData = {
  usageDate: string;
  startTime: string;
  endTime: string;
};

// --- NEW TYPES FOR FEEDBACK ---
export interface Feedback {
  id: string;
  residentId: string;
  residentName?: string;
  apartmentId: string;
  apartmentCode?: string;
  content: string;
  imageData?: string[]; // array of base64 strings
  status: 'SUBMITTED' | 'RESOLVED';
  submittedAt: string;
  adminResponseContent?: string;
  adminResponseImageData?: string[]; // array of base64 strings
  resolvedByUsername?: string;
  resolvedAt?: string;
}

export interface FeedbackSubmissionData {
  residentId: string;
  apartmentId: string;
  content: string;
  imageData?: string[]; // array of base64 strings
}

export interface ActivityLog {
  id: string;
  userId?: string;
  username: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details: string;
  ipAddress?: string;
  httpMethod?: string;
  httpPath?: string;
  statusCode?: number;
  oldValue?: any;
  newValue?: any;
  userAgent?: string;
  timestamp: string;
}

// --- MANAGEMENT FEES TYPES ---
export interface FeeConfig {
  id: number;
  management_fee_per_sqm: number;
  internet_fee: number;
  cable_tv_fee: number;
  parking_car_fee: number;
  parking_motorbike_fee: number;
  security_fee: number;
  cleaning_fee: number;
  effective_from: string;
  created_by?: string;
  created_by_username?: string;
  created_at?: string;
  enabled_fees?: {
    management?: boolean;
    internet?: boolean;
    cable_tv?: boolean;
    parking_car?: boolean;
    parking_motorbike?: boolean;
    security?: boolean;
    cleaning?: boolean;
  };
}

export interface ManagementFee {
  id: string;
  apartment_id: string;
  apartment_code?: string;
  house_type?: 'CANTATA' | 'TESLA';
  floor?: number;
  month: number;
  year: number;
  area: number;
  management_fee_per_sqm: number;
  management_fee: number;
  internet_fee: number;
  cable_tv_fee: number;
  security_fee: number;
  cleaning_fee: number;
  parking_car_quantity: number;
  parking_car_fee: number;
  parking_motorbike_quantity: number;
  parking_motorbike_fee: number;
  other_fees?: any[];
  total_amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  payment_date?: string;
  payment_method?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  created_by_username?: string;
}

export interface ManagementFeeSummary {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
}

export interface BulkGenerateResult {
  success: Array<{
    apartment_id: string;
    apartment_code: string;
    fee_id: string;
    total_amount: number;
  }>;
  failed: Array<{
    apartment_id: string;
    apartment_code: string;
    error: string;
  }>;
  skipped: Array<{
    apartment_id: string;
    apartment_code: string;
    reason: string;
  }>;
}

// ── REAL ESTATE INVENTORY & SALES MATRIX (TESLA, CANTATA, NOXH) ─────────
export type RealEstatePhase = 'TESLA' | 'CANTATA' | 'NOXH';

export type ProductSalesStatus = 
  | 'AVAILABLE'     // Sẵn bán
  | 'BOOKED'        // Đang giữ chỗ
  | 'DEPOSITED'     // Đã đặt cọc
  | 'CONTRACTED'    // Đã ký HĐMB
  | 'HANDED_OVER'   // Đã bàn giao
  | 'LOCKED';       // Khóa bán

export interface ProductUnit {
  id: string;
  code: string;
  house_type: string;
  phase_code?: RealEstatePhase;
  block_code?: string;
  lot_number?: string;
  floor: number;
  area: number;
  land_area?: number;
  construction_area?: number;
  usable_area?: number;
  certificate_area?: number;
  land_price_before_vat?: number;
  construction_price_before_vat?: number;
  vat_rate?: number;
  maintenance_fee_2pct?: number;
  sales_status?: ProductSalesStatus;
  effectiveStatus?: ProductSalesStatus;
  direction?: string;
  view_description?: string;
  bedroom_count?: number;
  bathroom_count?: number;
  priceBreakdown?: {
    landPrice: number;
    constructionPrice: number;
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    maintenanceFee2Pct: number;
    grandTotal: number;
  };
  contracts?: Array<{
    id: string;
    contract_code: string;
    status: string;
    customer_id: string;
    customers?: { id: string; name: string; phone_number: string };
  }>;
  sales_bookings?: Array<{
    id: string;
    booking_code: string;
    expires_at: string;
    sales_person_id: string;
  }>;
}

export interface SalesMatrixStats {
  total: number;
  available: number;
  booked: number;
  deposited: number;
  contracted: number;
  handedOver: number;
  locked: number;
}

// ── CRM 3-TIER: LEADS & OPPORTUNITIES ────────────────────────────────────
export type LeadStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'SITE_VISIT' | 'QUALIFIED' | 'LOST' | 'CONVERTED';
export type LeadScore = 'HOT' | 'WARM' | 'COLD';
export type LeadSource = 'WALK_IN' | 'LANDING_PAGE' | 'ZALO' | 'HOTLINE' | 'EVENT' | 'AGENCY' | 'REFERRAL';

export interface CrmLead {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  source?: LeadSource;
  phase_interest?: RealEstatePhase;
  budget_range?: string;
  status: LeadStatus;
  lead_score?: LeadScore;
  assigned_to?: string;
  notes?: string;
  last_contact_at?: string;
  reassign_deadline?: string;
  created_at?: string;
  updated_at?: string;
  crm_opportunities?: CrmOpportunity[];
}

export type OpportunityStage = 
  | 'PROSPECT' 
  | 'PRESENTATION' 
  | 'CART' 
  | 'BOOKING' 
  | 'DEPOSIT' 
  | 'CONTRACT_DRAFT' 
  | 'WON' 
  | 'LOST';

export interface CrmOpportunity {
  id: string;
  lead_id?: string;
  customer_id?: string;
  apartment_id?: string;
  title: string;
  stage: OpportunityStage;
  estimated_value: number;
  expected_close_date?: string;
  payment_method_intent?: 'DIRECT' | 'BANK_LOAN';
  assigned_to?: string;
  lost_reason?: string;
  created_at?: string;
  updated_at?: string;
  apartments?: ProductUnit;
  crm_leads?: CrmLead;
}

// ── PHASE 2: CART, ATOMIC BOOKINGS & DEPOSITS ───────────────────────────
export interface SalesCartItem {
  id: string;
  sales_person_id: string;
  sales_person_name?: string;
  apartment_id: string;
  lead_id?: string;
  customer_id?: string;
  notes?: string;
  expires_at: string;
  created_at: string;
  apartments?: ProductUnit;
}

export type BookingStatus = 'ACTIVE' | 'EXTENDED' | 'EXPIRED' | 'CONVERTED_DEPOSIT' | 'CANCELLED';

export interface SalesBooking {
  id: string;
  booking_code: string;
  apartment_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  lead_id?: string;
  opportunity_id?: string;
  sales_person_id: string;
  booking_fee: number;
  deposit_intent_amount?: number;
  status: BookingStatus;
  expires_at: string;
  extension_count: number;
  released_at?: string;
  release_reason?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  apartments?: ProductUnit;
}

export type DepositStatus = 
  | 'PENDING_PAYMENT' 
  | 'ACTIVE' 
  | 'CONVERTED_CONTRACT' 
  | 'REFUNDED' 
  | 'FORFEITED' 
  | 'TRANSFERRED';

export interface DepositReceipt {
  id: string;
  deposit_code: string;
  apartment_id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_id_number?: string;
  opportunity_id?: string;
  booking_id?: string;
  sales_person_id: string;
  deposit_amount: number;
  paid_amount: number;
  topup_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  status: DepositStatus;
  deadline_date?: string;
  payment_confirmed_by?: string;
  payment_confirmed_at?: string;
  transferred_from_apt_id?: string;
  transferred_to_apt_id?: string;
  refund_reason?: string;
  refund_approved_by?: string;
  refund_approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  apartments?: ProductUnit;
}
