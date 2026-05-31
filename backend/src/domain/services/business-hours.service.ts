import { TicketDiscardReason } from '../entities/ticket';

export class BusinessHoursService {
  private static readonly OPENING_HOUR = 7;
  private static readonly CLOSING_HOUR = 17;

  isWithinBusinessHours(date: Date): boolean {
    const hour = date.getHours();
    return hour >= BusinessHoursService.OPENING_HOUR && hour < BusinessHoursService.CLOSING_HOUR;
  }

  getDiscardReason(date: Date): TicketDiscardReason | null {
    if (this.isWithinBusinessHours(date)) {
      return null;
    }

    return date.getHours() < BusinessHoursService.OPENING_HOUR
      ? TicketDiscardReason.BEFORE_OPENING
      : TicketDiscardReason.AFTER_CLOSING;
  }
}
