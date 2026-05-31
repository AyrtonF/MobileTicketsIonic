import { randomUUID } from 'node:crypto';
import { Ticket, TicketStatus, TicketType, TicketDiscardReason } from '../../domain/ticket';
import { TicketRepository } from '../../domain/repositories/ticket-repository';
import { formatTicketCode } from '../../domain/services/ticket-code';
import { BusinessHoursService } from '../../domain/services/business-hours.service';
import { UseCaseDependencies } from './usecase-dependencies';

export interface IssueTicketResult {
  ticket: Ticket;
  discarded: boolean;
  discardReason?: TicketDiscardReason;
}

export class IssueTicketUseCase {
  private readonly now: () => Date;
  private readonly random: () => number;
  private readonly businessHoursService: BusinessHoursService;

  constructor(
    private readonly repository: TicketRepository,
    dependencies: UseCaseDependencies = {},
  ) {
    this.now = dependencies.now ?? (() => new Date());
    this.random = dependencies.random ?? Math.random;
    this.businessHoursService = new BusinessHoursService();
  }

  async execute(type: TicketType): Promise<IssueTicketResult> {
    const issuedAt = this.now();
    const start = this.startOfDay(issuedAt);
    const end = this.startOfNextDay(issuedAt);
    const sequence = (await this.repository.countIssuedByTypeBetween(type, start, end)) + 1;
    const code = formatTicketCode(issuedAt, type, sequence);

    // Validar expediente
    const businessHoursValidation = this.businessHoursService.validate(issuedAt);
    const isOutsideBusinessHours = !businessHoursValidation.isWithinBusinessHours;

    // Verificar descarte
    const discardedByRandom = this.random() < 0.05;
    const discardedByBusinessHours = isOutsideBusinessHours;
    const discarded = discardedByRandom || discardedByBusinessHours;

    // Definir motivo do descarte (priorizar business hours)
    let discardReason: TicketDiscardReason | undefined;
    if (discardedByBusinessHours) {
      discardReason = 'OUTSIDE_BUSINESS_HOURS';
    } else if (discardedByRandom) {
      discardReason = 'RANDOM_5_PERCENT';
    }

    const ticket: Ticket = {
      id: randomUUID(),
      code,
      type,
      sequence,
      status: discarded ? TicketStatus.DESCARTADA : TicketStatus.EMITIDA,
      issuedAt,
      attendedAt: null,
      guiche: null,
      serviceMinutes: null,
    };

    await this.repository.save(ticket);

    return { ticket, discarded, discardReason };
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private startOfNextDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  }
}
