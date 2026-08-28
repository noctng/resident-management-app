const { z } = require('zod');

const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  content: z.string().min(1, 'Nội dung không được để trống'),
  summary: z.string().optional().nullable(),
  category: z.enum(['general', 'event', 'notice', 'urgent']).optional().default('general'),
  is_pinned: z.boolean().optional().default(false),
  cover_image_base64: z.string().optional().nullable(),
  media_base64_list: z.array(z.string()).optional(),
});

// update: tất cả optional, không đổi id
const updateAnnouncementSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  category: z.enum(['general', 'event', 'notice', 'urgent']).optional(),
  is_pinned: z.boolean().optional(),
  cover_image_base64: z.string().optional().nullable(),
  media_base64_list: z.array(z.string()).optional(),
  keep_media_urls: z.array(z.string()).optional(),
});

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };
