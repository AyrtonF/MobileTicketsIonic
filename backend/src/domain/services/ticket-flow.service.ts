import { Ticket, TicketType } from '../ticket';

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

  /**
   * Calcula o tempo de atendimento em minutos com distribuição uniforme.
   *
   * SP (Prioritária): 15 minutos ±5 minutos = 10 a 20 minutos (distribuição uniforme)
   * SG (Geral): 5 minutos ±3 minutos = 2 a 8 minutos (distribuição uniforme)
   * SE (Exames): 1 minuto para 95%, 5 minutos para 5%
   *
   * @param type Tipo de senha
   * @param random Função de número aleatório entre 0 e 1
   * @returns Minutos de atendimento
   */
  calculateServiceMinutes(type: TicketType, random: () => number): number {
    if (type === TicketType.PRIORITARIA) {
      return 10 + (10 * random());
    }

    if (type === TicketType.GERAL) {
      return 2 + (6 * random());
    }

    // SE: 1 minuto para 95%, 5 minutos para 5%
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
