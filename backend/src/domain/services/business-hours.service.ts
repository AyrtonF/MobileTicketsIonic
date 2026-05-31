import { TicketDiscardReason } from '../entities/ticket';

export interface BusinessHoursValidationResult {
  isWithinBusinessHours: boolean;
  reason?: TicketDiscardReason;
}

export class BusinessHoursService {
  private static readonly OPENING_HOUR = 7;
  private static readonly CLOSING_HOUR = 17;

  isWithinBusinessHours(date: Date): boolean {
    const hour = date.getHours();
    return hour >= BusinessHoursService.OPENING_HOUR && hour < BusinessHoursService.CLOSING_HOUR;
  }

  validate(date: Date): BusinessHoursValidationResult {
    const reason = this.getDiscardReason(date);
    return reason
      ? { isWithinBusinessHours: false, reason }
      : { isWithinBusinessHours: true };
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
