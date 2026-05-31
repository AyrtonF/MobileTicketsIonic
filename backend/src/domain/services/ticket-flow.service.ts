import { Ticket, TicketType } from '../entities/ticket';

export class TicketFlowService {
  selectNextTicket(waitingTickets: Ticket[], lastCalledType: TicketType | null): Ticket | null {
    const cycle = this.buildCycle(lastCalledType);

    for (const type of cycle) {
      const ticket = waitingTickets.find((candidate) => candidate.type === type);

      if (ticket) {
        return ticket;
      }
    }

    return null;
  }

  calculateServiceMinutes(type: TicketType, random: () => number): number {
    if (type === TicketType.PRIORITARIA) {
      return 10 + (10 * random());
    }

    if (type === TicketType.GERAL) {
      return 2 + (6 * random());
    }

    return random() < 0.95 ? 1 : 5;
  }

  private buildCycle(lastCalledType: TicketType | null): TicketType[] {
    if (lastCalledType === TicketType.PRIORITARIA) {
      return [TicketType.EXAMES, TicketType.GERAL, TicketType.PRIORITARIA];
    }

    if (lastCalledType === TicketType.EXAMES) {
      return [TicketType.GERAL, TicketType.PRIORITARIA, TicketType.EXAMES];
    }

    if (lastCalledType === TicketType.GERAL) {
      return [TicketType.PRIORITARIA, TicketType.EXAMES, TicketType.GERAL];
    }

    return [TicketType.PRIORITARIA, TicketType.EXAMES, TicketType.GERAL];
  }
}