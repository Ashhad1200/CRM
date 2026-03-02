/**
 * Comms module — meeting scheduler service.
 *
 * Manages availability slots, booking links, and scheduled meetings.
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import { generateId } from '@softcrm/shared-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Availability ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function setAvailability(
  tenantId: string,
  userId: string,
  slots: { dayOfWeek: number; startTime: string; endTime: string; timezone?: string }[],
) {
  const db = getPrismaClient();

  // Replace all slots for this user
  await db.availabilitySlot.deleteMany({ where: { tenantId, userId } });

  const created = await Promise.all(
    slots.map((slot) =>
      db.availabilitySlot.create({
        data: {
          id: generateId(),
          tenantId,
          userId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone: slot.timezone ?? 'UTC',
        },
      }),
    ),
  );

  return created;
}

export async function getAvailability(tenantId: string, userId: string) {
  const db = getPrismaClient();
  return db.availabilitySlot.findMany({
    where: { tenantId, userId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Available Slots ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAvailableSlots(
  tenantId: string,
  userId: string,
  date: Date,
  durationMinutes = 30,
) {
  const db = getPrismaClient();
  const dayOfWeek = date.getDay();

  const availability = await db.availabilitySlot.findMany({
    where: { tenantId, userId, dayOfWeek, isActive: true },
    orderBy: { startTime: 'asc' },
  });

  // Get existing bookings for that day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookings = await db.bookedMeeting.findMany({
    where: {
      tenantId,
      hostUserId: userId,
      startTime: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED'] },
    },
    orderBy: { startTime: 'asc' },
  });

  // Generate time slots and exclude booked ones
  const slots: { start: string; end: string }[] = [];
  for (const avail of availability) {
    const [startH, startM] = avail.startTime.split(':').map(Number);
    const [endH, endM] = avail.endTime.split(':').map(Number);
    const startMin = startH! * 60 + startM!;
    const endMin = endH! * 60 + endM!;

    for (let min = startMin; min + durationMinutes <= endMin; min += durationMinutes) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(min / 60), min % 60, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

      // Check conflicts
      const conflict = bookings.some(
        (b) => slotStart < b.endTime && slotEnd > b.startTime,
      );

      if (!conflict) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
    }
  }

  return slots;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Booking ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function bookMeeting(
  tenantId: string,
  data: {
    hostUserId: string;
    title: string;
    startTime: Date;
    endTime: Date;
    guestEmail?: string;
    guestName?: string;
    contactId?: string;
    dealId?: string;
    description?: string;
    location?: string;
    timezone?: string;
  },
) {
  const db = getPrismaClient();
  const bookingLink = generateId().slice(0, 8);

  return db.bookedMeeting.create({
    data: {
      id: generateId(),
      tenantId,
      hostUserId: data.hostUserId,
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      guestEmail: data.guestEmail,
      guestName: data.guestName,
      contactId: data.contactId,
      dealId: data.dealId,
      description: data.description,
      location: data.location,
      timezone: data.timezone ?? 'UTC',
      bookingLink,
      status: 'CONFIRMED',
    },
  });
}

export async function getMeetings(
  tenantId: string,
  userId: string,
  from?: Date,
  to?: Date,
) {
  const db = getPrismaClient();
  return db.bookedMeeting.findMany({
    where: {
      tenantId,
      hostUserId: userId,
      ...(from || to ? { startTime: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function cancelMeeting(tenantId: string, meetingId: string) {
  const db = getPrismaClient();
  return db.bookedMeeting.update({
    where: { id: meetingId, tenantId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
}

export async function completeMeeting(tenantId: string, meetingId: string) {
  const db = getPrismaClient();
  return db.bookedMeeting.update({
    where: { id: meetingId, tenantId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}
