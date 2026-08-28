const prisma = require('../config/prisma');

const publishedSelect = {
  id: true, title: true, content: true, summary: true, category: true,
  cover_image: true, media_urls: true, is_pinned: true,
  published_at: true, created_at: true, users: { select: { username: true } },
};

async function getPublished({ limit = 50, offset = 0 }) {
  return prisma.announcements.findMany({
    where: { is_published: true },
    orderBy: [{ is_pinned: 'desc' }, { published_at: 'desc' }],
    take: parseInt(limit, 10),
    skip: parseInt(offset, 10),
    select: publishedSelect,
  });
}

async function getById(id) {
  return prisma.announcements.findUnique({
    where: { id },
    include: { users: { select: { username: true } } },
  });
}

async function getAll() {
  return prisma.announcements.findMany({
    orderBy: [{ created_at: 'desc' }],
    include: { users: { select: { username: true } } },
  });
}

async function create(data) {
  return prisma.announcements.create({ data });
}

async function update(id, data) {
  return prisma.announcements.update({ where: { id }, data });
}

async function setPublishState(id, isPublished) {
  const now = new Date();
  return prisma.announcements.update({
    where: { id },
    data: {
      is_published: isPublished,
      published_at: isPublished ? now : null,
      updated_at: now,
    },
  });
}

async function remove(id) {
  return prisma.announcements.delete({ where: { id } });
}

module.exports = {
  getPublished, getById, getAll, create, update, setPublishState, remove,
};
