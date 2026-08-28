const cron = require('node-cron');
const prisma = require('../config/prisma');
const { sendPushToApartment } = require('../services/pushService');

// Track which bookings we've already sent reminders for (in-memory, resets on restart)
const notifiedUpcomingBookings = new Set();
const notifiedExpiringBookings = new Set();

const amenityLabels = {
    GYM: 'Phòng Gym',
    POOL: 'Hồ bơi',
    PARTY: 'Phòng tiệc',
    MOVIE: 'Phòng chiếu phim',
    KARAOKE: 'Phòng Karaoke',
    BBQ: 'Khu tiệc BBQ',
    TENNIS: 'Sân Tennis',
    YOGA: 'Phòng Yoga',
    LIBRARY: 'Thư viện',
    PLAYGROUND: 'Sân chơi trẻ em',
};

/**
 * 1. Check for upcoming amenity bookings (starting in next 0 - 20 minutes)
 */
async function checkUpcomingAmenityBookings() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 2 * 60 * 1000); // -2 min grace
    const windowEnd = new Date(now.getTime() + 20 * 60 * 1000); // +20 min

    try {
        const upcomingBookings = await prisma.amenity_usage.findMany({
            where: {
                start_time: {
                    gte: windowStart,
                    lte: windowEnd,
                },
                status: {
                    in: ['CONFIRMED', 'PENDING'],
                },
            },
            include: {
                apartments: { select: { id: true, code: true } },
            },
        });

        if (upcomingBookings.length === 0) return;

        for (const booking of upcomingBookings) {
            if (notifiedUpcomingBookings.has(booking.id)) continue;

            const startTime = new Date(booking.start_time);
            const minutesUntil = Math.max(0, Math.round((startTime.getTime() - now.getTime()) / 60000));

            const timeStr = startTime.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
            });

            const amenityLabel = amenityLabels[booking.amenity] || booking.amenity;
            const aptCode = booking.apartments?.code ? ` (${booking.apartments.code})` : '';

            const body =
                minutesUntil <= 1
                    ? `Lượt đặt ${amenityLabel}${aptCode} bắt đầu ngay lúc ${timeStr}! Mã đặt: #${booking.booking_code}.`
                    : `Lượt đặt ${amenityLabel}${aptCode} sẽ bắt đầu lúc ${timeStr} (còn ~${minutesUntil} phút). Mã đặt: #${booking.booking_code}.`;

            try {
                await sendPushToApartment(booking.apartment_id, {
                    title: `⏰ Sắp đến giờ: ${amenityLabel}`,
                    body,
                    url: '/?tab=amenities',
                    tag: `amenity-start-${booking.id}`,
                });

                notifiedUpcomingBookings.add(booking.id);
                console.log(
                    `[AmenityReminder] Sent START reminder for booking #${booking.booking_code} (${amenityLabel} at ${timeStr})`
                );
            } catch (err) {
                console.error(
                    `[AmenityReminder] Failed to send START reminder for booking #${booking.booking_code}:`,
                    err.message
                );
            }
        }
    } catch (err) {
        console.error('[AmenityReminder] Error checking upcoming bookings:', err.message);
    }
}

/**
 * 2. Check for expiring amenity bookings (ending in next 0 - 15 minutes)
 */
async function checkExpiringAmenityBookings() {
    const now = new Date();
    const windowStart = new Date(now.getTime());
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000); // +15 min

    try {
        const expiringBookings = await prisma.amenity_usage.findMany({
            where: {
                end_time: {
                    gte: windowStart,
                    lte: windowEnd,
                },
                status: {
                    in: ['CONFIRMED', 'USED', 'PENDING'],
                },
            },
            include: {
                apartments: { select: { id: true, code: true } },
            },
        });

        if (expiringBookings.length === 0) return;

        for (const booking of expiringBookings) {
            if (notifiedExpiringBookings.has(booking.id)) continue;

            const endTime = new Date(booking.end_time);
            const minutesRemaining = Math.max(0, Math.round((endTime.getTime() - now.getTime()) / 60000));

            const timeStr = endTime.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
            });

            const amenityLabel = amenityLabels[booking.amenity] || booking.amenity;
            const aptCode = booking.apartments?.code ? ` (${booking.apartments.code})` : '';

            const body =
                minutesRemaining <= 2
                    ? `Lượt đặt ${amenityLabel}${aptCode} sẽ kết thúc lúc ${timeStr}! Vui lòng thu dọn tư trang và bàn giao.`
                    : `Lượt đặt ${amenityLabel}${aptCode} sẽ kết thúc lúc ${timeStr} (còn ~${minutesRemaining} phút). Vui lòng chuẩn bị thu dọn.`;

            try {
                await sendPushToApartment(booking.apartment_id, {
                    title: `⏳ Sắp hết giờ: ${amenityLabel}`,
                    body,
                    url: '/?tab=amenities',
                    tag: `amenity-end-${booking.id}`,
                });

                notifiedExpiringBookings.add(booking.id);
                console.log(
                    `[AmenityReminder] Sent END reminder for booking #${booking.booking_code} (${amenityLabel} at ${timeStr})`
                );
            } catch (err) {
                console.error(
                    `[AmenityReminder] Failed to send END reminder for booking #${booking.booking_code}:`,
                    err.message
                );
            }
        }
    } catch (err) {
        console.error('[AmenityReminder] Error checking expiring bookings:', err.message);
    }
}

/**
 * Schedule amenity reminder cron job — runs every 3 minutes
 */
function scheduleAmenityReminders() {
    // Run every 3 minutes for high accuracy
    cron.schedule('*/3 * * * *', async () => {
        await checkUpcomingAmenityBookings();
        await checkExpiringAmenityBookings();

        // Cleanup sets if getting large
        if (notifiedUpcomingBookings.size > 500) notifiedUpcomingBookings.clear();
        if (notifiedExpiringBookings.size > 500) notifiedExpiringBookings.clear();
    });

    console.log('✅ Amenity reminder cron job scheduled (every 3 minutes)');
}

module.exports = { scheduleAmenityReminders };
