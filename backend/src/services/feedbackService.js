const repo = require('../repositories/feedbackRepository');
const { generateRandomId } = require('../utils/helpers');
const fileHelpers = require('../utils/fileHelpers');
const { enqueue } = require('../queues/notificationQueue');

// Map entity (snake_case từ Prisma) → DTO (camelCase trả frontend).
// Giữ NGUYÊN shape của formatter `ff` trong controller cũ.
function mapToDTO(r) {
  return {
    id: r.id,
    residentId: r.resident_id,
    residentName: r.residents ? r.residents.name : null,
    apartmentId: r.apartment_id,
    apartmentCode: r.apartments ? r.apartments.code : null,
    content: r.content,
    imageData: (r.image_data || []).filter(Boolean),
    status: r.status,
    submittedAt: r.submitted_at,
    adminResponseContent: r.admin_response_content,
    adminResponseImageData: (r.admin_response_image_data || []).filter(Boolean),
    resolvedByUsername: r.users ? r.users.username : null,
    resolvedAt: r.resolved_at,
  };
}

async function getAllFeedback() {
  const feedback = await repo.listAll();
  return feedback.map(mapToDTO);
}

async function getFeedbackByApartment(apartmentId) {
  const feedback = await repo.listByApartment(apartmentId);
  return feedback.map(mapToDTO);
}

async function createFeedback(dto, files) {
  const { residentId, apartmentId, content } = dto;

  const id = `feedback_${generateRandomId()}`;
  const imageData = [];
  for (const f of files || []) {
    const filename = await fileHelpers.saveImg(f, id, imageData.length, 'pic');
    imageData.push(filename);
  }

  const created = await repo.create({
    id,
    resident_id: residentId,
    apartment_id: apartmentId,
    content,
    image_data: imageData,
  });

  return mapToDTO(created);
}

async function resolveFeedback(id, dto, files, userId) {
  const adminResponseImageData = [];
  for (const f of files || []) {
    const filename = await fileHelpers.saveImg(f, id, adminResponseImageData.length, 'res');
    adminResponseImageData.push(filename);
  }

  const updated = await repo.update(id, {
    status: 'RESOLVED',
    admin_response_content: dto.adminResponseContent,
    admin_response_image_data: adminResponseImageData,
    resolved_by_user_id: userId,
    resolved_at: new Date(),
  });

  // Push notification to apartment residents (fire-and-forget)
  enqueue({
    type: 'announcement',
    recipient: { apartmentId: updated.apartment_id },
    payload: {
      title: '📢 Phản ánh của bạn đã được xử lý',
      body: updated.admin_response_content
        ? `BQL: "${updated.admin_response_content.slice(0, 100)}"`
        : `Phản ánh về "${updated.content.slice(0, 60)}" đã được BQL giải quyết xong.`,
      url: '/?tab=feedback',
      tag: `feedback-${updated.id}`,
    },
  }).catch(console.error);

  return mapToDTO(updated);
}

module.exports = {
  mapToDTO,
  getAllFeedback,
  getFeedbackByApartment,
  createFeedback,
  resolveFeedback,
};
