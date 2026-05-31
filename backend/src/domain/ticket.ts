export enum TicketType {
  PRIORITARIA = 'SP',
  GERAL = 'SG',
  EXAMES = 'SE',
}

export enum TicketStatus {
  EMITIDA = 'EMITIDA',
  ATENDIDA = 'ATENDIDA',
  DESCARTADA = 'DESCARTADA',
}

export enum TicketDiscardReason {
  BEFORE_OPENING = 'BEFORE_OPENING',
  AFTER_CLOSING = 'AFTER_CLOSING',
  RANDOM_5_PERCENT = 'RANDOM_5_PERCENT',
}

export type TicketPriorityGroup = 'PRIORITARIA' | 'NAO_PRIORITARIA';

export type TicketPeriod = 'daily' | 'monthly';

export interface Ticket {
  id: string;
  code: string;
  type: TicketType;
  sequence: number;
  status: TicketStatus;
  issuedAt: Date;
  attendedAt: Date | null;
  guiche: string | null;
  serviceMinutes: number | null;
}

export interface TicketSummary {
  totalIssued: number;
  totalAttended: number;
  totalDiscarded: number;
  issuedByType: Record<TicketType, number>;
  attendedByType: Record<TicketType, number>;
  waitingByType: Record<TicketType, number>;
}

export interface TicketReportItem {
  code: string;
  type: TicketType;
  status: TicketStatus;
  issuedAt: string;
  attendedAt: string | null;
  guiche: string | null;
  serviceMinutes: number | null;
}

export interface TicketReportResponse {
  period: TicketPeriod;
  referenceDate: string;
  waitingCount: number;
  summary: TicketSummary;
  details: TicketReportItem[];
}

export interface TicketOverviewResponse extends TicketReportResponse {
  recentCalls: TicketReportItem[];
}