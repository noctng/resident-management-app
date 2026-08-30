#!/usr/bin/env python3
# Build USER_GUIDE_v1.6.docx — Hướng dẫn người dùng dựa trên Blueprint A.4 / E.1
import docx
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

# ---- Base styles ----
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(10.5)

INK = RGBColor(0x17, 0x23, 0x1F)
ACCENT = RGBColor(0xB8, 0x72, 0x2E)
TEAL = RGBColor(0x3E, 0x6E, 0x64)

def set_cell_bg(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hexcolor)
    tcPr.append(shd)

def style_heading(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = INK if level > 1 else ACCENT
    return h

def add_para(text, bold=False, italic=False, size=10.5, color=None, space_after=4):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    r.font.size = Pt(size)
    if color:
        r.font.color.rgb = color
    p.paragraph_format.space_after = Pt(space_after)
    return p

def add_bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        p.add_run(text)
    else:
        p.add_run(text)
    return p

def add_table(headers, rows, col_widths=None, header_bg='17231F', font_size=8.5):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ''
        p = hdr[i].paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.size = Pt(font_size)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_bg(hdr[i], header_bg)
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ''
            p = cells[i].paragraphs[0]
            run = p.add_run(str(val))
            run.font.size = Pt(font_size)
            if i == 0:
                run.bold = True
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in t.rows:
                row.cells[i].width = Inches(w)
    return t

# ============ COVER ============
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title.add_run('HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG')
r.bold = True
r.font.size = Pt(24)
r.font.color.rgb = ACCENT

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run('Hệ thống Quản lý Kinh doanh Bất động sản & Vận hành Khu đô thị')
r.font.size = Pt(13)
r.font.color.rgb = TEAL

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta.add_run('Dựa trên Blueprint A.4 (Vai trò) & E.1 (Ma trận phân quyền RBAC)\n').italic = True
meta.add_run('Tài liệu: USER-GUIDE · Phiên bản 1.6 · Áp dụng cùng bản Blueprint v1.6').font.size = Pt(9)

doc.add_paragraph()
note = doc.add_paragraph()
note.alignment = WD_ALIGN_PARAGRAPH.CENTER
nr = note.add_run('Tài liệu này hướng dẫn người dùng theo từng vai trò: nhân viên nội bộ (Admin / Kinh doanh / Vận hành / Tài chính / Pháp chế) và Cư dân (Cổng thông tin cư dân). Mọi quyền hạn tuân thủ ma trận E.1.')
nr.italic = True
nr.font.size = Pt(9)
nr.font.color.rgb = RGBColor(0x5A, 0x69, 0x60)

doc.add_page_break()

# ============ CHƯƠNG 1: KÝ HIỆU & NGUYÊN TẮC ============
style_heading('1. Ký hiệu quyền & Nguyên tắc chung', 1)

add_para('Hệ thống dùng mô hình phân quyền theo vai trò (RBAC). Mỗi tài khoản được gán một hoặc nhiều vai trò; quyền hạn được xác định bởi tập hợp vai trò đó. Ma trận E.1 quy định quyền chi tiết theo từng chức năng nghiệp vụ.', space_after=6)

style_heading('1.1. Ý nghĩa ký hiệu (E.1)', 2)
add_table(
    ['Ký hiệu', 'Nghĩa tiếng Việt', 'Diễn giải'],
    [
        ['C', 'Tạo (Create)', 'Tạo mới bản ghi nghiệp vụ (phiếu, hồ sơ, đăng ký...).'],
        ['R', 'Xem (Read)', 'Xem / tra cứu dữ liệu. Mọi vai trò đều có quyền xem ở phạm vi được gán (ABAC).'],
        ['U', 'Sửa (Update)', 'Cập nhật, chỉnh sửa bản ghi (không xóa).'],
        ['D', 'Xóa logic (Delete)', 'Vô hiệu hóa / xóa mềm có duyệt — không xóa vật lý.'],
        ['A', 'Duyệt (Approve)', 'Phê duyệt / ký số. Mọi A ghi nhận người duyệt, thời gian và ý kiến.'],
        ['–', 'Không có quyền', 'Không được thao tác chức năng này.'],
    ],
    col_widths=[0.8, 1.8, 4.0],
)

style_heading('1.2. Nguyên tắc tách nhiệm vụ (SoD)', 2)
add_para('Hệ thống chặn xung đột nhiệm vụ (Segregation of Duties):', bold=True)
add_bullet('Người lập phiếu thu ≠ người duyệt hoàn tiền.')
add_bullet('Người ghi chỉ số công tơ ≠ người chốt kỳ.')
add_bullet('Người soạn hợp đồng ≠ người trình ký.')
add_para('Khi vi phạm SoD, hệ thống từ chối thao tác và ghi nhật ký (audit log).', italic=True, color=RGBColor(0x5A,0x69,0x60))

style_heading('1.3. Hai luồng đăng nhập', 2)
add_bullet('Nhân viên nội bộ:', 'Đăng nhập bằng tài khoản hệ thống (username + mật khẩu), token JWT_ADMIN_SECRET. Truy cập toàn bộ phân hệ qua giao diện quản trị.')
add_bullet('Cư dân:', 'Đăng nhập Cổng thông tin cư dân bằng SĐT + mật khẩu, token JWT_RESIDENT_SECRET. Chỉ truy cập được các chức năng của vai trò RESIDENT (xem §6).')

doc.add_page_break()

# ============ CHƯƠNG 2: DANH SÁCH VAI TRÒ (A.4) ============
style_heading('2. Danh sách vai trò (Blueprint A.4)', 1)
add_para('Vai trò là "mẫu phân quyền"; một người có thể nhận nhiều vai trò. Dưới đây là 17 vai trò trong hệ thống:', space_after=6)

roles = [
    ['ADMIN', 'Quản trị hệ thống', 'Chung', 'Cấu hình, phân quyền, số hóa chứng từ, tích hợp, nhật ký.'],
    ['DIR', 'Ban điều hành', 'Chung', 'Xem mọi báo cáo, duyệt vượt hạn mức.'],
    ['SM', 'Giám đốc kinh doanh', 'Bán hàng', 'Chính sách giá/CK/hoa hồng, duyệt HĐ, phê duyệt vượt hạn mức.'],
    ['SHEAD', 'Trưởng phòng kinh doanh', 'Bán hàng', 'Quản lý team, phân lead, duyệt giữ chỗ/giỏ hàng, CK trong hạn mức.'],
    ['SALE', 'Nhân viên kinh doanh', 'Bán hàng', 'Lead/chăm sóc/giỏ hàng/giữ chỗ/cọc; không xóa dữ liệu tài chính.'],
    ['AGENT', 'Đại lý/kênh', 'Bán hàng', 'Giữ chỗ/cọc hộ khách qua cổng đối tác (giới hạn phạm vi).'],
    ['CS', 'Chăm sóc khách hàng', 'Bán hàng', 'Tiếp nhận tổng đài, hỗ trợ sau bán hàng.'],
    ['ACC-S', 'Kế toán bán hàng', 'Bán hàng', 'Phiếu thu, đối soát, công nợ phải thu khách hàng, xuất hóa đơn thanh toán.'],
    ['LAW', 'Pháp chế hợp đồng', 'Bán hàng', 'Mẫu HĐ, rà pháp lý, trình ký, lưu trữ chứng từ.'],
    ['PMO', 'Điều hành bàn giao', 'Cả 2', 'Kế hoạch bàn giao, nghiệm thu, cầu nối sang vận hành.'],
    ['PMS-M', 'Trưởng BQL khu đô thị', 'Vận hành', 'Biểu phí, phê duyệt miễn giảm/thi công/ký quỹ, SLA, các phê duyệt theo thẩm quyền.'],
    ['PMS-FE', 'Nhân sự BQL (tiếp nhận)', 'Vận hành', 'Hỏi đáp quầy, tiếp nhận phản ánh, ghi chỉ số hỗ trợ.'],
    ['PMS-BILL', 'Kế toán dịch vụ', 'Vận hành', 'Chốt công tơ, tính phí, hóa đơn, công nợ cư dân, đối soát thu.'],
    ['PMS-TECH', 'Kỹ thuật/bảo trì', 'Vận hành', 'Xử lý phản ánh kỹ thuật, CMMS, nghiệm thu thi công.'],
    ['PMS-SEC', 'An ninh/kiểm soát', 'Vận hành', 'Ra vào, xe, khách, giao hàng (chỉ giao diện tác nghiệp).'],
    ['RESIDENT', 'Cư dân', 'Cổng cư dân', 'Xem hóa đơn, thanh toán, phản ánh, đặt tiện ích, đăng ký xe/thi công.'],
    ['AUDIT', 'Kiểm toán nội bộ', 'Chung', 'Chỉ đọc toàn bộ (kể cả nhật ký), phục vụ minh bạch cộng đồng.'],
]
add_table(['Mã', 'Tên vai trò', 'Phân hệ', 'Trách nhiệm chính'], roles,
          col_widths=[0.9, 1.7, 0.9, 3.1])

doc.add_page_break()

# ============ CHƯƠNG 3: HƯỚNG DẪN NHÂN VIÊN ============
style_heading('3. Hướng dẫn Nhân viên nội bộ (phân hệ Quản trị)', 1)
add_para('Sau khi đăng nhập bằng tài khoản hệ thống, giao diện hiển thị các menu theo vai trò được gán. Dưới đây tóm tắt thao tác điển hình theo nhóm vai trò. Chi tiết quyền từng chức năng xem Ma trận E.1 (§7).', space_after=6)

style_heading('3.1. Quản trị hệ thống (ADMIN)', 2)
add_bullet('Cấu hình hệ thống & phân quyền: Quản lý vai trò, gán quyền, cấu hình thông số (ADMIN có đầy đủ CRUD ở mọi module).')
add_bullet('Quản lý người dùng: Tạo/sửa tài khoản nhân viên, gán nhiều vai trò qua màn hình "Cấu hình phân quyền" (xem ma trận quyền từng vai trò bằng checkbox).')
add_bullet('Số hóa chứng từ & tích hợp: Kết nối HĐĐT, ZNS, cổng thanh toán, xem nhật ký hệ thống.')

style_heading('3.2. Kinh doanh (DIR / SM / SHEAD / SALE / AGENT / CS / ACC-S / LAW)', 2)
add_bullet('SALE: Vào "Cơ hội của tôi" để chăm sóc lead, lập giỏ hàng, giữ chỗ, lập phiếu đặt cọc. Không được xóa dữ liệu tài chính.')
add_bullet('SHEAD: Duyệt giữ chỗ/giỏ hàng, phân lead cho team, áp dụng chiết khấu trong hạn mức (≤2%).')
add_bullet('SM: Duyệt hợp đồng, phê duyệt chiết khấu vượt hạn mức (≤5%), duyệt đợt mở bán.')
add_bullet('ACC-S: Lập phiếu thu, đối soát, xuất hóa đơn thanh toán, quản lý công nợ phải thu.')
add_bullet('LAW: Soạn/thẩm định hợp đồng, trình ký, lưu trữ chứng từ.')
add_bullet('AGENT: Qua cổng đối tác, chỉ thấy khách do mình giới thiệu; giữ chỗ/cọc hộ trong phạm vi đó.')
add_bullet('CS: Tiếp nhận tổng đài, hỗ trợ sau bán hàng, cập nhật hồ sơ khách.')

style_heading('3.3. Vận hành & Dịch vụ (PMS-M / PMS-FE / PMS-BILL / PMS-TECH / PMS-SEC / PMO)', 2)
add_bullet('PMS-BILL: Chốt công tơ, tính phí, phát hành hóa đơn, quản lý công nợ cư dân, đối soát thu.')
add_bullet('PMS-TECH: Xử lý phản ánh kỹ thuật, quản lý bảo trì (CMMS), nghiệm thu thi công.')
add_bullet('PMS-FE: Tiếp nhận quầy, ghi chỉ số công tơ hỗ trợ, tiếp nhận phản ánh.')
add_bullet('PMS-M: Phê duyệt biểu phí, miễn/giảm, hồ sơ thi công, ký quỹ, các SLA.')
add_bullet('PMS-SEC: Quản lý ra vào, xe, khách, giao hàng (chỉ giao diện tác nghiệp).')
add_bullet('PMO: Kế hoạch bàn giao, nghiệm thu, cầu nối sang vận hành.')

style_heading('3.4. Kiểm toán (AUDIT)', 2)
add_para('Tài khoản AUDIT chỉ có quyền Xem (R) toàn bộ dữ liệu, kể cả nhật ký hệ thống — phục vụ minh bạch nội bộ và cộng đồng cư dân. Không được tạo/sửa/xóa.', italic=True)

doc.add_page_break()

# ============ CHƯƠNG 4: CỔNG CƯ DÂN ============
style_heading('4. Cổng thông tin Cư dân (vai trò RESIDENT)', 1)
add_para('Cư dân truy cập Cổng thông tin cư dân (web portal) để tự phục vụ các dịch vụ của khu đô thị. Tài khoản cư dân được tạo tự động qua chức năng "Đồng bộ & Tạo tài khoản" của Ban quản lý (cho mọi cư dân có số điện thoại).', space_after=6)

style_heading('4.1. Đăng nhập', 2)
add_bullet('Truy cập trang Cổng cư dân, chọn "Quản trị" để quay lại hệ thống nội bộ (nếu có tài khoản nhân viên).')
add_bullet('Đăng nhập bằng Số điện thoại + Mật khẩu (mặc định Abc@12345, nên đổi sau lần đầu).')
add_bullet('Nếu một SĐT thuộc nhiều căn hộ, hệ thống hiển thị danh sách căn hộ để chọn — chọn căn hộ muốn thao tác.')

style_heading('4.2. Các chức năng cư dân được phép', 2)
add_table(
    ['Chức năng', 'Quyền', 'Thao tác', 'Ghi chú'],
    [
        ['Xem hóa đơn', 'R', 'Xem lịch sử hóa đơn điện/nước/phí dịch vụ theo căn hộ.', 'unified_billing:R'],
        ['Thanh toán', 'U', 'Thanh toán / gạch nợ hóa đơn căn hộ.', 'unified_billing:U'],
        ['Phản ánh', 'C, R, U', 'Gửi phản ánh, theo dõi, cập nhật phản ánh của mình.', 'feedback:C,R,U'],
        ['Đặt tiện ích', 'C', 'Đặt chỗ tiện ích chung của căn hộ.', 'amenities:C'],
        ['Đăng ký xe', 'C, R', 'Đăng ký xe/thẻ ra vào cho căn hộ.', 'vehicles:C,R'],
        ['Đăng ký thi công', 'C', 'Đăng ký thi công hoàn thiện căn hộ.', 'construction:C'],
        ['Báo bảo hành', 'C, R', 'Gửi yêu cầu bảo hành/bảo trì.', 'warranty:C,R'],
        ['Cập nhật thông tin', 'U', 'Cập nhật thông tin cá nhân tài khoản.', 'residents:U'],
    ],
    col_widths=[1.4, 0.9, 2.6, 1.5],
)

style_heading('4.3. Nguyên tắc căn hộ nhiều thành viên (Mô hình A)', 2)
add_para('Hệ thống áp dụng Mô hình A: mọi thành viên trong căn hộ có số điện thoại đều được cấp tài khoản riêng (mỗi người một SĐT = một tài khoản).', bold=True)
add_bullet('Quyền RESIDENT được cấp theo vai trò, áp dụng đồng nhất cho mọi thành viên — không phân biệt chủ hộ / người thân / người thuê.')
add_bullet('Dữ liệu (hóa đơn, tiện ích, xe, phản ánh...) được quản lý theo căn hộ (apartment_id), là dữ liệu chung của cả căn hộ.')
add_bullet('Ai trong căn hộ có tài khoản đều có thể đặt tiện ích / đăng ký xe / phản ánh — thao tác được ghi nhận theo căn hộ chung.')
add_bullet('Khi đăng nhập, hệ thống hiển thị tất cả căn hộ mà thành viên đó thuộc; chọn căn hộ rồi thực hiện thao tác.')

style_heading('4.4. Bảo mật tài khoản cư dân', 2)
add_bullet('Mật khẩu mặc định (Abc@12345) — Ban quản lý có thể "Reset mật khẩu" về mặc định khi cư dân quên.')
add_bullet('Cư dân nên đổi mật khẩu sau lần đăng nhập đầu; sử dụng chức năng "Đổi mật khẩu" trong portal.')
add_bullet('Mỗi thao tác của cư dân được hệ thống ghi nhận theo căn hộ, đảm bảo minh bạch.')

doc.add_page_break()

# ============ CHƯƠNG 5: KỊCH BẢN THỰC TẾ ============
style_heading('5. Các kịch bản thực tế (Cư dân)', 1)

style_heading('5.1. Xem & thanh toán hóa đơn', 2)
add_para('1. Đăng nhập → chọn căn hộ.  2. Mở tab "Hóa đơn / Tổng hợp".  3. Xem lịch sử các kỳ.  4. Chọn kỳ chưa thanh toán → "Thanh toán" (quét QR hoặc theo hướng dẫn).  5. Hệ thống ghi nhận đã thu, gửi thông báo xác nhận.')

style_heading('5.2. Gửi phản ánh', 2)
add_para('1. Tab "Phản ánh" → "Gửi phản ánh".  2. Điền nội dung, đính kèm ảnh (nếu có).  3. Gửi.  4. Theo dõi trạng thái xử lý và phản hồi từ Ban quản lý.')

style_heading('5.3. Đặt tiện ích chung', 2)
add_para('1. Tab "Tiện ích" → chọn loại tiện ích + khung giờ.  2. Xác nhận đặt chỗ.  3. Hủy nếu cần (trước thời gian quy định). Lịch đặt chỗ là chung của căn hộ.')

style_heading('5.4. Đăng ký xe / thi công / bảo hành', 2)
add_para('1. Tab tương ứng (Xe / Thi công / Bảo hành).  2. Điền thông tin (biển số, hạng mục thi công, mô tả sự cố...).  3. Gửi đăng ký.  4. Nhận kết quả xử lý từ Ban quản lý.')

doc.add_page_break()

# ============ CHƯƠNG 6: MA TRẬN E.1 ============
style_heading('6. Ma trận phân quyền mẫu (Blueprint E.1)', 1)
add_para('Ký hiệu: C=Tạo · R=Xem · U=Sửa · D=Xóa logic · A=Duyệt · –=không có quyền. Ma trận này là mặc định, có thể tinh chỉnh theo tổ chức thực tế của từng dự án. Mọi A ghi nhận người duyệt; D luôn là soft-delete có duyệt.', italic=True, space_after=6)

e1_headers = ['Nghiệp vụ', 'ADMIN', 'DIR', 'SM', 'SHEAD', 'SALE', 'AGENT', 'ACC-S', 'LAW', 'PMO', 'PMS-M', 'PMS-BILL', 'PMS-TECH', 'RESIDENT', 'AUDIT']
e1_rows = [
    ['Cây sản phẩm & thuộc tính', 'CRU', 'R', 'RU', 'R', 'R', '–', 'R', 'R', 'R', 'R', 'R', 'R', '–', 'R'],
    ['Phiên bản giá (pricebook)', 'R', 'R', 'CUA', 'R', 'R', '–', 'R', 'R', '–', '–', '–', '–', '–', 'R'],
    ['Đợt mở bán / khóa bán', 'R', 'A', 'CUA', 'U', '–', '–', '–', '–', '–', '–', '–', '–', '–', 'R'],
    ['Lead & phân bổ', 'CRU', 'R', 'RU', 'CU', 'CRU', 'C(mình)', '–', '–', '–', '–', '–', '–', '–', 'R'],
    ['Cơ hội & chăm sóc', 'CRU', 'R', 'RU', 'RU', 'CRU', 'CRU(mình)', '–', '–', '–', '–', '–', '–', '–', 'R'],
    ['Giỏ hàng', 'R', '–', 'R', 'R', 'CRU', 'C', '–', '–', '–', '–', '–', '–', '–', 'R'],
    ['Giữ chỗ', 'R', 'R', 'A(hạn mức)', 'A', 'CU', 'CU(mình)', '–', '–', '–', '–', '–', '–', 'R(trạng thái)', 'R'],
    ['Phiếu đặt cọc', 'R', 'R', 'A', 'U', 'CU', 'C(mình)', 'R', 'R', '–', '–', '–', '–', '–', 'R'],
    ['Thu tiền bán hàng / phiếu thu', 'R', 'R', '–', '–', '–', '–', 'CU', '–', '–', '–', '–', '–', 'R(đích)', 'R'],
    ['Hoàn cọc / tịch cọc', 'R', 'A', 'A', '–', '–', '–', 'CU', 'R', '–', '–', '–', '–', '–', 'R'],
    ['Soạn HĐMB', 'R', '–', 'R', 'R', 'R', '–', 'R', 'CU', 'R', '–', '–', '–', '–', 'R'],
    ['Trình ký / ký HĐ', 'R', 'A', 'A', '–', '–', '–', '–', 'CU', '–', '–', '–', '–', '–', 'R'],
    ['Phụ lục điều chỉnh HĐ', 'R', 'A', 'A', '–', '–', '–', 'R', 'CU', 'R', '–', '–', '–', 'R', 'R'],
    ['LTT: gia hạn/cơ cấu', 'R', 'A', 'A', '–', '–', '–', 'CU', 'R', '–', '–', '–', '–', 'R', 'R'],
    ['Chuyển nhượng', 'R', 'A', 'A', 'U', 'CU', '–', 'CU', 'CU', '–', '–', '–', '–', 'R(khách)', 'R'],
    ['Kế hoạch & biên bản bàn giao', 'R', 'R', 'A', 'R', 'R', '–', 'R', 'R', 'CU', '–', '–', '–', '–', 'R'],
    ['Xuất số công tơ (tại bàn giao)', 'R', '–', 'R', '–', '–', '–', 'R', '–', 'CU', 'R', 'CU', 'CU', 'R', 'R'],
    ['Hồ sơ cư dân / hộ', 'R', 'R', '–', '–', '–', '–', 'R', '–', 'R', 'RU', 'RU', 'R', 'R(hộ mình)', 'R'],
    ['Biểu phí', 'R', 'R', '–', '–', '–', '–', 'R', '–', '–', 'CUA', 'RU', 'R', 'R', 'R'],
    ['Tính phí & chốt kỳ', 'R', 'R', '–', '–', '–', '–', 'R', '–', '–', 'A', 'CU', 'R', '–', 'R'],
    ['Ghi chỉ số công tơ', 'R', '–', '–', '–', '–', '–', '–', '–', '–', 'R', 'CU', 'CU', 'R(căn mình)', 'R'],
    ['Phát hành hóa đơn', 'R', 'R', '–', '–', '–', '–', 'CU', '–', '–', 'A', 'CU', '–', 'R(của mình)', 'R'],
    ['Miễn/giảm phí', 'R', 'R', '–', '–', '–', '–', 'R', '–', '–', 'A', 'CU', '–', '–', 'R'],
    ['Phiếu thu dịch vụ / đối soát', 'R', 'R', '–', '–', '–', '–', '–', '–', '–', 'R', 'CU', '–', 'R', 'R'],
    ['Ticket phản ánh', 'R', 'R', '–', '–', '–', '–', '–', '–', '–', 'RUA', 'R', 'CRU(xử lý)', 'CR(định danh mình)', 'R'],
    ['Tiện ích & đặt chỗ', 'R', 'R', '–', '–', '–', '–', '–', '–', '–', 'A', 'RU', 'RU', 'CR(mình)', 'R'],
    ['Hồ sơ thi công', 'R', 'R', '–', '–', '–', '–', '–', '–', '–', 'A', 'R', 'CU', 'C', 'R'],
    ['Xe/thẻ ra vào', 'R', '–', '–', '–', '–', '–', '–', '–', '–', 'RU', 'RU', 'R', 'C(mình)', 'R'],
    ['Chi quỹ bảo trì', 'R', 'A', '–', '–', '–', '–', 'R', 'R', '–', 'CU', 'R', 'CU', '–', 'R'],
    ['Báo cáo & BI', 'R', 'R', 'R', 'R', 'R(mình)', 'R(mình)', 'R', 'R', 'R', 'R', 'R', 'R', 'R(hộ mình)', 'R'],
    ['Cấu hình hệ thống / phân quyền', 'CRUD', '–', '–', '–', '–', '–', '–', '–', '–', '–', '–', '–', '–', 'R'],
]
t = add_table(e1_headers, e1_rows, font_size=7.0)
# narrow first col
for row in t.rows:
    row.cells[0].width = Inches(1.6)

add_para('')
add_para('Ghi chú: "(mình)" / "(hộ mình)" / "(căn mình)" / "(đích)" nghĩa là quyền chỉ áp dụng trên dữ liệu thuộc phạm vi cá nhân/căn hộ của người dùng (ABAC).', italic=True, size=8.5, color=RGBColor(0x5A,0x69,0x60))

doc.add_page_break()

# ============ CHƯƠNG 7: BẢO MẬT & HỖ TRỢ ============
style_heading('7. Bảo mật & Hỗ trợ', 1)
add_bullet('Định danh:', 'SSO nội bộ (OIDC); MFA bắt buộc với vai trò tài chính/quản trị. Tài khoản dịch vụ dùng client-credential + secret rotation.')
add_bullet('Mật khẩu/secret:', 'Lưu qua biến môi trường; cột nhạy cảm (CCCD, SĐT) mã hóa tầng ứng dụng.')
add_bullet('Audit:', 'Mọi thao tác nghiệp vụ ghi nhật ký (ai, IP, thời gian). Bảng nhật ký chỉ tài khoản AUDIT được xem toàn bộ.')
add_bullet('SoD:', 'Hệ thống tự động chặn xung đột nhiệm vụ (người lập ≠ người duyệt).')
add_bullet('Hỗ trợ:', 'Cư dân liên hệ Ban quản lý qua tổng đài hoặc trực tiếp tại quầy BQL khu đô thị.')

style_heading('8. Phụ lục — Đường dẫn API Cổng cư dân (tham khảo kỹ thuật)', 1)
add_para('Các endpoint dành riêng cho tài khoản cư dân (yêu cầu token cư dân, enforce quyền RESIDENT):', space_after=4)
add_table(
    ['Phương thức', 'Endpoint', 'Quyền', 'Mô tả'],
    [
        ['GET', '/api/resident-portal/billing?apartmentId=', 'unified_billing:R', 'Xem hóa đơn căn hộ'],
        ['POST', '/api/resident-portal/billing/pay?apartmentId=', 'unified_billing:U', 'Thanh toán hóa đơn'],
        ['GET', '/api/resident-portal/feedback?apartmentId=', 'feedback:R', 'Xem phản ánh'],
        ['POST', '/api/resident-portal/feedback?apartmentId=', 'feedback:C', 'Gửi phản ánh'],
        ['GET', '/api/resident-portal/vehicles?apartmentId=', 'vehicles:R', 'Xem xe đăng ký'],
        ['POST', '/api/resident-portal/vehicles?apartmentId=', 'vehicles:C', 'Đăng ký xe'],
        ['GET', '/api/resident-portal/amenities?apartmentId=', 'amenities:R', 'Xem đặt tiện ích'],
        ['POST', '/api/resident-portal/amenities/booking?apartmentId=', 'amenities:C', 'Đặt tiện ích'],
        ['GET', '/api/resident-portal/construction?apartmentId=', 'construction:R', 'Xem hồ sơ thi công'],
        ['POST', '/api/resident-portal/construction/register?apartmentId=', 'construction:C', 'Đăng ký thi công'],
        ['GET', '/api/resident-portal/warranty?apartmentId=', 'warranty:R', 'Xem bảo hành'],
        ['POST', '/api/resident-portal/warranty?apartmentId=', 'warranty:C', 'Gửi yêu cầu bảo hành'],
        ['PUT', '/api/resident-portal/profile', 'residents:U', 'Cập nhật thông tin cá nhân'],
    ],
    col_widths=[0.9, 3.4, 1.5, 1.5],
    font_size=8.0,
)
add_para('Mọi endpoint trên đều kiểm tra quyền sở hữu căn hộ (cư dân chỉ truy cập được căn hộ mình thuộc) và enforce ma trận RESIDENT.', italic=True, size=8.5, color=RGBColor(0x5A,0x69,0x60))

doc.save('USER_GUIDE_v1.6.docx')
print('Saved USER_GUIDE_v1.6.docx')
