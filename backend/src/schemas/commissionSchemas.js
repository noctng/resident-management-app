const { z } = require('zod');

// Schema cho Zod validation ở boundary (route). Giữ nguyên giá trị mặc định
// và response shape của controller cũ — chỉ thêm cận/validation cấu trúc.

const createCommissionPolicySchema = z.object({
  policy_name: z.string().min(1, 'Vui lòng nhập tên chính sách hoa hồng'),
  beneficiary_type: z.string().optional().default('INTERNAL_SALE'),
  phase_code: z.string().optional().default('ALL'),
  commission_rate: z.number().optional().default(1.5),
  commission_fixed_amount: z.number().optional().default(0),
  trigger_milestone: z.string().optional().default('ON_CONTRACT_SIGNED'),
  staged_percentages: z.any().optional().nullable(),
  description: z.string().optional().nullable(),
});

const generateCommissionSchema = z.object({
  contract_id: z.string().min(1, 'Vui lòng chọn hợp đồng'),
  policy_id: z.string().optional().nullable(),
  beneficiary_type: z.string().optional().default('INTERNAL_SALE'),
  beneficiary_name: z.string().optional().nullable(),
  beneficiary_phone: z.string().optional().nullable(),
  beneficiary_bank_account: z.string().optional().nullable(),
  beneficiary_bank_name: z.string().optional().nullable(),
  custom_commission_rate: z.number().optional().nullable(),
});

const approveCommissionSchema = z.object({
  notes: z.string().optional().nullable(),
});

const createPayoutSchema = z.object({
  amount: z.number({ invalid_type_error: 'Số tiền chi trả phải là số' }).refine((v) => v > 0, {
    message: 'Số tiền chi trả phải lớn hơn 0',
  }),
  payout_date: z.string().optional(),
  payment_method: z.string().optional(),
  reference_doc: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

module.exports = {
  createCommissionPolicySchema,
  generateCommissionSchema,
  approveCommissionSchema,
  createPayoutSchema,
};
