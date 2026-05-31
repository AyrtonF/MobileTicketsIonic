export enum TicketType {
  PRIORITARIA = 'SP',
  GERAL = 'SG',
  EXAMES = 'SE',
}

export type TicketPeriod = 'daily' | 'monthly';

export interface TicketDto {
  code: string;
  type: TicketType;
  status: 'EMITIDA' | 'ATENDIDA' | 'DESCARTADA';
  issuedAt: string;
  attendedAt: string | null;
  guiche: string | null;
  serviceMinutes: number | null;
}

export interface TicketSummaryDto {
  totalIssued: number;
  totalAttended: number;
  totalDiscarded: number;
  issuedByType: Record<TicketType, number>;
  attendedByType: Record<TicketType, number>;
  waitingByType: Record<TicketType, number>;
}

export interface TicketReportDto {
  period: TicketPeriod;
  referenceDate: string;
  waitingCount: number;
  summary: TicketSummaryDto;
  details: TicketDto[];
}

export interface TicketOverviewDto extends TicketReportDto {
  recentCalls: TicketDto[];
}

export interface IssueTicketResultDto {
  ticket: TicketDto;
  discarded: boolean;
  discardReason: 'BEFORE_OPENING' | 'AFTER_CLOSING' | 'RANDOM_5_PERCENT' | null;
}

export interface CallNextTicketResultDto {
  ticket: TicketDto | null;
}

export function ticketTypeLabel(type: TicketType): string {
  switch (type) {
    case TicketType.PRIORITARIA:
      return 'Prioritária';
    case TicketType.GERAL:
      return 'Geral';
    case TicketType.EXAMES:
      return 'Exames';
  }
}

export function ticketStatusLabel(status: TicketDto['status']): string {
  switch (status) {
    case 'EMITIDA':
      return 'Em espera';
    case 'ATENDIDA':
      return 'Atendida';
    case 'DESCARTADA':
      return 'Descartada';
  }
}