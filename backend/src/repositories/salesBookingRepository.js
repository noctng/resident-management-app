const prisma = require('../config/prisma');

// SalesBooking Repository — chỉ Prisma query thuần
module.exports = {
  // Cart operations
  findCartItems: async (salesPersonId) => prisma.sales_cart_items.findMany({ where: { sales_person_id: salesPersonId }, include: { apartments: true }, orderBy: { created_at: 'desc' } }),

  findCartItem: async (salesPersonId, apartmentId) =>
    prisma.sales_cart_items.findFirst({ where: { sales_person_id: salesPersonId, apartment_id: apartmentId } }),

  createCartItem: async (data) => prisma.sales_cart_items.create({ data, include: { apartments: true } }),

  deleteCartItem: async (id) => prisma.sales_cart_items.delete({ where: { id } }),

  deleteCartItemsByApartment: async (apartmentId) => prisma.sales_cart_items.deleteMany({ where: { apartment_id: apartmentId } }),

  // Booking operations
  findBookings: async (where) =>
    prisma.sales_bookings.findMany({
      where,
      include: { apartments: true },
      orderBy: { created_at: 'desc' },
    }),

  findBookingById: async (id) => prisma.sales_bookings.findUnique({ where: { id }, include: { apartments: true } }),

  createBooking: async (data) => prisma.sales_bookings.create({ data: { ...data, include: { apartments: true } } }),

  updateBooking: async (id, data) => prisma.sales_bookings.update({ where: { id }, data }),

  deleteBookingItem: async (id) => prisma.sales_cart_items.delete({ where: { id } }),

  // Apartment operations
  findApartmentById: async (id) => prisma.apartments.findUnique({ where: { id } }),

  updateApartmentStatus: async (id, data) => prisma.apartments.update({ where: { id }, data }),

  findActiveBooking: async (apartmentId) => prisma.sales_bookings.findFirst({ where: { apartment_id, status: 'ACTIVE' } }),
};