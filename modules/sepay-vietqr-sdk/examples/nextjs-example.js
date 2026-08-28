/**
 * Next.js App Router (Route Handler) Example
 * File: app/api/webhook/sepay/route.js (hoặc route.ts)
 */
import { NextResponse } from 'next/server';
import { normalizeText, extractEntityCode } from 'sepay-vietqr-sdk';

export async function POST(req) {
  try {
    const payload = await req.json();
    const { transferType, transferAmount, content, referenceCode } = payload;

    // Chỉ nhận tiền vào
    if (transferType !== 'in') {
      return NextResponse.json({ success: true, message: 'Ignored' });
    }

    console.log('💳 Tiền về:', transferAmount, 'Nội dung:', content);

    // Tìm mã đơn hàng
    const orderId = extractEntityCode(content, 'DH');
    if (orderId) {
      // await prisma.order.update(...)
      console.log('✅ Đã kích hoạt đơn hàng:', orderId);
    }

    return NextResponse.json({ success: true, referenceCode });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}
