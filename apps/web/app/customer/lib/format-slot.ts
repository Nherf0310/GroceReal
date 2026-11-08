import { DeliverySlot } from '../types';

export function formatSlotTime(startTime: string, endTime: string): string {
  const start = startTime.slice(0, 5);
  const end = endTime.slice(0, 5);
  return `${start} – ${end}`;
}

export function formatSlotDisplay(
  slot?: { date: string | Date; startTime: string; endTime: string } | null
): string {
  if (!slot) return 'No upcoming slot';
  try {
    const d = new Date(slot.date);
    const dateStr = d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr}, ${formatSlotTime(slot.startTime, slot.endTime)}`;
  } catch {
    return formatSlotTime(slot.startTime, slot.endTime);
  }
}

export function isSlotAvailable(slot: DeliverySlot): boolean {
  if (slot.bookedCount >= slot.capacity) return false;
  try {
    const now = new Date();
    const [hours, minutes] = slot.startTime.split(':').map(Number);
    const start = new Date(slot.date);
    start.setHours(hours, minutes, 0, 0);
    const minutesUntilStart = (start.getTime() - now.getTime()) / (1000 * 60);
    return minutesUntilStart >= 60;
  } catch {
    return slot.bookedCount < slot.capacity;
  }
}

