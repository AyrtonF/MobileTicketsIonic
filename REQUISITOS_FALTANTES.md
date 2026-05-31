# Implementação de Requisitos Faltantes - MobileTicketsIonic

**Data:** 2026-05-31  
**Status:** Planejamento  
**Prioridade:** Alta

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Problemas Identificados](#problemas-identificados)
3. [Solução Proposta](#solução-proposta)
4. [Especificações Técnicas](#especificações-técnicas)
5. [Implementação Detalhada](#implementação-detalhada)
6. [Testes](#testes)
7. [Documentação](#documentação)
8. [Timeline](#timeline)

---

## 🎯 Visão Geral

O projeto **MobileTicketsIonic** é um sistema de controle de atendimento em filas de laboratórios médicos desenvolvido com:
- **Frontend:** Ionic 7 + Angular 17 + Capacitor 5
- **Backend:** Node.js + Express (TypeScript)
- **Banco de Dados:** MySQL 8.0
- **Containerização:** Docker Compose

### Conformidade Atual

| Aspecto | Status | Conformidade |
|---------|--------|--------------|
| Infraestrutura | ✅ | 100% |
| Agentes (AS, AA, AC) | ✅ | 100% |
| Tipos de Senha (SP, SG, SE) | ✅ | 100% |
| Formato YYMMDD-PPSQ | ✅ | 100% |
| Descarte 5% | ✅ | 100% |
| Endpoints | ✅ | 100% |
| Relatórios | ✅ | 100% |
| Tempo Médio (TM) | ⚠️ | 85% |
| **Expediente (7h-17h)** | ❌ | **0% - CRÍTICO** |
| Priorização | ✅ | 100% |
| **Conformidade Total** | | **92%** |

---

## 🔴 Problemas Identificados

### 1. Expediente (7h - 17h) - CRÍTICO ❌

#### Requisito do Documento
```
O sistema deverá tratar o início do expediente de trabalho, para a chamada das senhas,
começando às 7 horas da manhã e o final do expediente de trabalho, encerrando às 17 horas.
Caso sobrem senhas estas deverão ser descartadas.

De modo geral 5% de todas as senhas de atendimento emitidas não são atendidas, por
motivos diversos, sob responsabilidade do AC, então estas deverão ser descartadas sem que
seja executado o SA.
```

#### Situação Atual
- ❌ Não há validação de horário de funcionamento
- ❌ Sistema aceita emissão de senhas 24/7
- ❌ Senhas emitidas fora do expediente não são automaticamente descartadas

#### Impacto
- Sistema não bloqueia operações fora do horário permitido
- Relatórios podem incluir senhas emitidas em horários inválidos
- Não há auditoria de tentativas de uso fora do expediente

---

### 2. Tempo Médio de Atendimento (TM) - VARIAÇÃO ⚠️

#### Requisito do Documento
```
O tempo de retenção é chamado de:
- TM (Tempo Médio de atendimento): exclusivamente para as senhas SP e SG, sendo
  de 5 minutos para a SG e de 15 minutos para a senha SP.

A senha prioritária (SP), como o próprio nome diz, tem maior prioridade no atendimento, sendo
chamada para o próximo guichê que estiver disponível. Seu TM pode variar aleatoriamente 5
minutos para baixo ou para cima, em igual distribuição.

Já a senha geral (SG), por consequência, terá a menor prioridade de atendimento, sendo
chamada para atendimento assim que houver um guichê disponível após finalização do
atendimento para as senhas SP e SE, caso disponíveis. Seu TM varia em igual proporção 3
minutos para baixo ou para cima.

A senha para retirada de exames (SE) não possui prioridade, entretanto pelo tipo de
atendimento ser muito rápido, seu tempo médio de atendimento (TM) é inferior a 1 minuto, a
priorização será ignorada e a senha será chamada para o próximo guichê que estiver
disponível, após o atendimento de uma senha SP. Seu TM pode variar entre 1 minuto para 95%
dos SA e 5 minutos para 5% dos SA.
```

#### Situação Atual
```typescript
// Em: backend/src/domain/services/ticket-flow.service.ts
calculateServiceMinutes(type: TicketType, random: () => number): number {
  if (type === TicketType.PRIORITARIA) {
    return random() < 0.5 ? 10 : 20;  // ❌ 50/50 entre 10 e 20
  }
  if (type === TicketType.GERAL) {
    return random() < 0.5 ? 2 : 8;    // ❌ 50/50 entre 2 e 8
  }
  return random() < 0.95 ? 1 : 5;     // ✅ Correto: 95% = 1 min, 5% = 5 min
}
```

#### O que é Esperado
- **SP:** Variação aleatória de 10 a 20 minutos com **distribuição uniforme**
  - Significado: Qualquer valor entre 10 e 20 tem igual probabilidade
  - Média: 15 minutos (±5 minutos)
  
- **SG:** Variação aleatória de 2 a 8 minutos com **distribuição uniforme**
  - Significado: Qualquer valor entre 2 e 8 tem igual probabilidade
  - Média: 5 minutos (±3 minutos)
  
- **SE:** 1 minuto para 95%, 5 minutos para 5%
  - ✅ Já está correto!

#### Impacto
- Implementação atual usa distribuição discreta (apenas 2 valores)
- Esperado é distribuição contínua (qualquer valor no intervalo)
- Afeta realismo dos relatórios de tempo médio

---

## 💡 Solução Proposta

### Estratégia Global

1. **Criar serviço de validação de horário comercial**
   - Validar se data/hora está entre 7h e 17h
   - Testável e reutilizável
   - Injeção de dependência para testes

2. **Integrar validação no use case de emissão**
   - Verificar horário ao emitir senha
   - Marcar como DESCARTADA se fora do expediente
   - Retornar motivo do descarte

3. **Corrigir cálculo de tempo médio**
   - SP: usar distribuição uniforme 10-20 minutos
   - SG: usar distribuição uniforme 2-8 minutos
   - SE: manter 95/5

4. **Atualizar frontend**
   - Informar ao usuário motivo do descarte
   - Mostrar fora do expediente de forma clara

5. **Documentar mudanças**
   - README atualizado
   - Comportamento explicado

---

## 🔧 Especificações Técnicas

### Arquivo 1: `backend/src/domain/services/business-hours.service.ts` (NOVO)

**Responsabilidade:** Validar se uma data/hora está dentro do expediente (7h-17h)

**Localização:** `backend/src/domain/services/business-hours.service.ts`

**Interfaces:**
```typescript
export interface BusinessHoursValidation {
  isWithinBusinessHours: boolean;
  reason?: 'BEFORE_OPENING' | 'AFTER_CLOSING';
}

export type BusinessHourReason = 'BEFORE_OPENING' | 'AFTER_CLOSING';
```

**Classe:**
```typescript
export class BusinessHoursService {
  /**
   * Valida se uma data/hora está dentro do expediente comercial.
   * 
   * Expediente: 7h até 17h (23:59:59)
   * - 07:00:00 até 16:59:59 → Dentro do expediente
   * - 00:00:00 até 06:59:59 → Fora (BEFORE_OPENING)
   * - 17:00:00 até 23:59:59 → Fora (AFTER_CLOSING)
   * 
   * @param date Data e hora a validar
   * @returns Objeto indicando se está dentro do expediente
   */
  validate(date: Date): BusinessHoursValidation {
    const hour = date.getHours();
    
    if (hour < 7) {
      return {
        isWithinBusinessHours: false,
        reason: 'BEFORE_OPENING'
      };
    }
    
    if (hour >= 17) {
      return {
        isWithinBusinessHours: false,
        reason: 'AFTER_CLOSING'
      };
    }
    
    return {
      isWithinBusinessHours: true
    };
  }
}
```

**Testes esperados:**
```typescript
describe('BusinessHoursService', () => {
  const service = new BusinessHoursService();

  test('Deve aceitar 7:00:00', () => {
    const date = new Date(2026, 4, 31, 7, 0, 0);
    expect(service.validate(date).isWithinBusinessHours).toBe(true);
  });

  test('Deve aceitar 16:59:59', () => {
    const date = new Date(2026, 4, 31, 16, 59, 59);
    expect(service.validate(date).isWithinBusinessHours).toBe(true);
  });

  test('Deve rejeitar 6:59:59 (BEFORE_OPENING)', () => {
    const date = new Date(2026, 4, 31, 6, 59, 59);
    const result = service.validate(date);
    expect(result.isWithinBusinessHours).toBe(false);
    expect(result.reason).toBe('BEFORE_OPENING');
  });

  test('Deve rejeitar 17:00:00 (AFTER_CLOSING)', () => {
    const date = new Date(2026, 4, 31, 17, 0, 0);
    const result = service.validate(date);
    expect(result.isWithinBusinessHours).toBe(false);
    expect(result.reason).toBe('AFTER_CLOSING');
  });

  test('Deve rejeitar 23:59:59 (AFTER_CLOSING)', () => {
    const date = new Date(2026, 4, 31, 23, 59, 59);
    const result = service.validate(date);
    expect(result.isWithinBusinessHours).toBe(false);
    expect(result.reason).toBe('AFTER_CLOSING');
  });
});
```

---

### Arquivo 2: `backend/src/domain/entities/ticket.ts` (MODIFICADO)

**Responsabilidade:** Adicionar tipo para razão de descarte

**Mudança:** Adicionar novo tipo exportado

```typescript
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

// ✅ NOVO
export type TicketDiscardReason = 'RANDOM_5_PERCENT' | 'OUTSIDE_BUSINESS_HOURS';

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
```

---

### Arquivo 3: `backend/src/application/usecases/issue-ticket.usecase.ts` (MODIFICADO)

**Responsabilidade:** Integrar validação de expediente e retornar motivo de descarte

**Localização:** `backend/src/application/usecases/issue-ticket.usecase.ts`

**Mudanças:**

```typescript
import { randomUUID } from 'node:crypto';
import { Ticket, TicketStatus, TicketType, TicketDiscardReason } from '../../domain/entities/ticket';
import { TicketRepository } from '../../domain/repositories/ticket-repository';
import { formatTicketCode } from '../../domain/services/ticket-code';
import { BusinessHoursService } from '../../domain/services/business-hours.service'; // ✅ NOVO
import { UseCaseDependencies } from './usecase-dependencies';

// ✅ MODIFICADO: Adicionar discardReason
export interface IssueTicketResult {
  ticket: Ticket;
  discarded: boolean;
  discardReason?: TicketDiscardReason;
}

export class IssueTicketUseCase {
  private readonly now: () => Date;
  private readonly random: () => number;
  private readonly businessHoursService: BusinessHoursService; // ✅ NOVO

  constructor(
    private readonly repository: TicketRepository,
    dependencies: UseCaseDependencies = {},
  ) {
    this.now = dependencies.now ?? (() => new Date());
    this.random = dependencies.random ?? Math.random;
    this.businessHoursService = new BusinessHoursService(); // ✅ NOVO
  }

  async execute(type: TicketType): Promise<IssueTicketResult> {
    const issuedAt = this.now();
    const start = this.startOfDay(issuedAt);
    const end = this.startOfNextDay(issuedAt);
    const sequence = (await this.repository.countIssuedByTypeBetween(type, start, end)) + 1;
    const code = formatTicketCode(issuedAt, type, sequence);
    
    // ✅ NOVO: Validar expediente
    const businessHoursValidation = this.businessHoursService.validate(issuedAt);
    const isOutsideBusinessHours = !businessHoursValidation.isWithinBusinessHours;
    
    // ✅ MODIFICADO: Verificar descarte
    const discardedByRandom = this.random() < 0.05;
    const discardedByBusinessHours = isOutsideBusinessHours;
    const discarded = discardedByRandom || discardedByBusinessHours;
    
    // ✅ NOVO: Definir motivo do descarte
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

    return { ticket, discarded, discardReason }; // ✅ MODIFICADO
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private startOfNextDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  }
}
```

**Testes esperados:**
```typescript
describe('IssueTicketUseCase - Business Hours', () => {
  let mockRepository: any;
  let useCase: IssueTicketUseCase;

  beforeEach(() => {
    mockRepository = {
      countIssuedByTypeBetween: jest.fn().mockResolvedValue(0),
      save: jest.fn(),
    };
  });

  test('Deve descartar senha emitida às 6:59 (BEFORE_OPENING)', async () => {
    const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 6, 59, 0));
    useCase = new IssueTicketUseCase(mockRepository, { now: mockNow, random: () => 0.5 });

    const result = await useCase.execute(TicketType.GERAL);

    expect(result.discarded).toBe(true);
    expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
    expect(result.ticket.status).toBe(TicketStatus.DESCARTADA);
  });

  test('Deve emitir senha normalmente às 7:00', async () => {
    const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 7, 0, 0));
    useCase = new IssueTicketUseCase(mockRepository, { now: mockNow, random: () => 0.5 });

    const result = await useCase.execute(TicketType.GERAL);

    expect(result.discarded).toBe(false);
    expect(result.discardReason).toBeUndefined();
    expect(result.ticket.status).toBe(TicketStatus.EMITIDA);
  });

  test('Deve emitir senha normalmente às 16:59', async () => {
    const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 16, 59, 59));
    useCase = new IssueTicketUseCase(mockRepository, { now: mockNow, random: () => 0.5 });

    const result = await useCase.execute(TicketType.GERAL);

    expect(result.discarded).toBe(false);
    expect(result.discardReason).toBeUndefined();
    expect(result.ticket.status).toBe(TicketStatus.EMITIDA);
  });

  test('Deve descartar senha emitida às 17:00 (AFTER_CLOSING)', async () => {
    const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 17, 0, 0));
    useCase = new IssueTicketUseCase(mockRepository, { now: mockNow, random: () => 0.5 });

    const result = await useCase.execute(TicketType.GERAL);

    expect(result.discarded).toBe(true);
    expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
    expect(result.ticket.status).toBe(TicketStatus.DESCARTADA);
  });

  test('Deve priorizar descarte por OUTSIDE_BUSINESS_HOURS sobre RANDOM_5_PERCENT', async () => {
    const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 18, 0, 0));
    useCase = new IssueTicketUseCase(mockRepository, { now: mockNow, random: () => 0.02 }); // 2% (descarte aleatório)

    const result = await useCase.execute(TicketType.GERAL);

    expect(result.discarded).toBe(true);
    expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS'); // Motivo principal
  });

  test('Deve indicar descarte RANDOM_5_PERCENT dentro do expediente', async () => {
    const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 10, 0, 0));
    useCase = new IssueTicketUseCase(mockRepository, { now: mockNow, random: () => 0.03 }); // 3% (descarte aleatório)

    const result = await useCase.execute(TicketType.GERAL);

    expect(result.discarded).toBe(true);
    expect(result.discardReason).toBe('RANDOM_5_PERCENT');
  });
});
```

---

### Arquivo 4: `backend/src/domain/services/ticket-flow.service.ts` (MODIFICADO)

**Responsabilidade:** Corrigir cálculo de tempo médio com distribuição uniforme

**Localização:** `backend/src/domain/services/ticket-flow.service.ts`

**Mudanças:**

```typescript
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

  // ✅ MODIFICADO: Usar distribuição uniforme contínua
  calculateServiceMinutes(type: TicketType, random: () => number): number {
    if (type === TicketType.PRIORITARIA) {
      // SP: 15 minutos ±5 minutos = 10 a 20 minutos
      // Distribuição uniforme: Math.round(random() * (max - min) + min)
      return Math.round(random() * 10 + 10);
    }

    if (type === TicketType.GERAL) {
      // SG: 5 minutos ±3 minutos = 2 a 8 minutos
      // Distribuição uniforme: Math.round(random() * (max - min) + min)
      return Math.round(random() * 6 + 2);
    }

    // SE: 1 minuto para 95% dos SA e 5 minutos para 5% dos SA
    // ✅ Já está correto, mantém como estava
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
```

**Testes esperados:**
```typescript
describe('TicketFlowService - Service Minutes', () => {
  const service = new TicketFlowService();

  describe('SP (Prioritária) - 10 a 20 minutos', () => {
    test('Deve gerar minutos entre 10 e 20 para SP', () => {
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.PRIORITARIA, Math.random);
        expect(minutes).toBeGreaterThanOrEqual(10);
        expect(minutes).toBeLessThanOrEqual(20);
      }
    });

    test('Deve gerar valores variados para SP (não apenas 2 valores)', () => {
      const values = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.PRIORITARIA, Math.random);
        values.add(minutes);
      }
      expect(values.size).toBeGreaterThan(2); // Mais de 2 valores diferentes
    });
  });

  describe('SG (Geral) - 2 a 8 minutos', () => {
    test('Deve gerar minutos entre 2 e 8 para SG', () => {
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.GERAL, Math.random);
        expect(minutes).toBeGreaterThanOrEqual(2);
        expect(minutes).toBeLessThanOrEqual(8);
      }
    });

    test('Deve gerar valores variados para SG (não apenas 2 valores)', () => {
      const values = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.GERAL, Math.random);
        values.add(minutes);
      }
      expect(values.size).toBeGreaterThan(2); // Mais de 2 valores diferentes
    });
  });

  describe('SE (Exames) - 1 ou 5 minutos (95/5)', () => {
    test('Deve gerar 1 minuto para 95% dos casos', () => {
      const results = {
        one: 0,
        five: 0,
      };

      for (let i = 0; i < 10000; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.EXAMES, Math.random);
        if (minutes === 1) results.one++;
        if (minutes === 5) results.five++;
      }

      const percentOne = (results.one / 10000) * 100;
      const percentFive = (results.five / 10000) * 100;

      expect(percentOne).toBeGreaterThan(90); // ~95%
      expect(percentOne).toBeLessThan(99);
      expect(percentFive).toBeGreaterThan(1); // ~5%
      expect(percentFive).toBeLessThan(10);
    });
  });
});
```

---

### Arquivo 5: `frontend/src/app/services/ticket.models.ts` (MODIFICADO)

**Responsabilidade:** Adicionar tipo de razão de descarte

**Mudanças:**

```typescript
export enum TicketType {
  PRIORITARIA = 'SP',
  GERAL = 'SG',
  EXAMES = 'SE',
}

export type TicketPeriod = 'daily' | 'monthly';

// ✅ NOVO
export type TicketDiscardReason = 'RANDOM_5_PERCENT' | 'OUTSIDE_BUSINESS_HOURS';

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

// ✅ MODIFICADO: Adicionar discardReason
export interface IssueTicketResultDto {
  ticket: TicketDto;
  discarded: boolean;
  discardReason?: TicketDiscardReason;
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

// ✅ NOVO
export function discardReasonLabel(reason: TicketDiscardReason): string {
  switch (reason) {
    case 'RANDOM_5_PERCENT':
      return 'Descarte automático';
    case 'OUTSIDE_BUSINESS_HOURS':
      return 'Fora do expediente (7h-17h)';
  }
}
```

---

### Arquivo 6: `frontend/src/app/tab1/tab1.page.ts` (MODIFICADO)

**Responsabilidade:** Exibir motivo do descarte ao usuário

**Mudanças:**

```typescript
import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { finalize } from 'rxjs';
import { SenhaService } from '../services/senha.service';
import { 
  IssueTicketResultDto, 
  TicketOverviewDto, 
  TicketType, 
  ticketTypeLabel, 
  ticketStatusLabel,
  discardReasonLabel // ✅ NOVO
} from '../services/ticket.models';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit {
  readonly TicketType = TicketType;
  readonly ticketTypeLabel = ticketTypeLabel;
  readonly ticketStatusLabel = ticketStatusLabel;
  overview: TicketOverviewDto | null = null;
  loading = false;
  lastIssuedTicket: IssueTicketResultDto | null = null;

  constructor(
    public readonly senhaService: SenhaService,
    private readonly toastController: ToastController,
  ) {}

  ngOnInit(): void {
    void this.loadOverview();
  }

  emitir(tipo: TicketType): void {
    this.loading = true;
    this.senhaService.emitirSenha(tipo)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: async (result) => {
          this.lastIssuedTicket = result;
          
          // ✅ MODIFICADO: Usar lógica melhorada para mensagens
          let message: string;
          let color: 'success' | 'warning' | 'danger' = 'success';

          if (result.discarded) {
            color = 'warning';
            if (result.discardReason === 'OUTSIDE_BUSINESS_HOURS') {
              message = `Senha ${result.ticket.code} não foi emitida.\n${discardReasonLabel('OUTSIDE_BUSINESS_HOURS')}`;
            } else if (result.discardReason === 'RANDOM_5_PERCENT') {
              message = `Senha ${result.ticket.code} descartada automaticamente.`;
            } else {
              message = `Senha ${result.ticket.code} descartada automaticamente.`;
            }
          } else {
            message = `Senha ${result.ticket.code} emitida com sucesso!`;
          }

          await this.presentToast(message, color);
          await this.triggerHaptic(result.discarded ? 'warning' : 'success');
          void this.loadOverview();
        },
        error: async () => {
          await this.presentToast('Não foi possível emitir a senha.', 'danger');
          await this.triggerHaptic('error');
        },
      });
  }

  refresh(): void {
    void this.loadOverview();
  }

  private loadOverview(): Promise<void> {
    return new Promise((resolve) => {
      this.senhaService.obterPainel().subscribe({
        next: (overview) => {
          this.overview = overview;
          resolve();
        },
        error: async () => {
          await this.presentToast('Falha ao carregar o painel do cliente.', 'danger');
          resolve();
        },
      });
    });
  }

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2200,
      position: 'top',
    });

    await toast.present();
  }

  private async triggerHaptic(level: 'success' | 'warning' | 'error'): Promise<void> {
    try {
      await Haptics.notification({
        type:
          level === 'success'
            ? NotificationType.Success
            : level === 'warning'
              ? NotificationType.Warning
              : NotificationType.Error,
      });
    } catch {
      // Ignora em navegadores ou ambientes sem suporte nativo.
    }
  }
}
```

---

## 🧪 Testes

### Plano de Testes

#### 1. Testes Unitários - Business Hours Service

**Arquivo:** `backend/src/domain/services/__tests__/business-hours.service.test.ts`

```typescript
import { BusinessHoursService } from '../business-hours.service';

describe('BusinessHoursService', () => {
  const service = new BusinessHoursService();

  describe('Casos limite de abertura (7h)', () => {
    test('6:59:59 deve ser rejeitado (BEFORE_OPENING)', () => {
      const date = new Date(2026, 4, 31, 6, 59, 59);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('BEFORE_OPENING');
    });

    test('7:00:00 deve ser aceito', () => {
      const date = new Date(2026, 4, 31, 7, 0, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Casos limite de fechamento (17h)', () => {
    test('16:59:59 deve ser aceito', () => {
      const date = new Date(2026, 4, 31, 16, 59, 59);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('17:00:00 deve ser rejeitado (AFTER_CLOSING)', () => {
      const date = new Date(2026, 4, 31, 17, 0, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('AFTER_CLOSING');
    });

    test('23:59:59 deve ser rejeitado (AFTER_CLOSING)', () => {
      const date = new Date(2026, 4, 31, 23, 59, 59);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('AFTER_CLOSING');
    });
  });

  describe('Horários do meio do expediente', () => {
    test('10:30:00 deve ser aceito', () => {
      const date = new Date(2026, 4, 31, 10, 30, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('14:15:30 deve ser aceito', () => {
      const date = new Date(2026, 4, 31, 14, 15, 30);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Horários noturnos', () => {
    test('0:00:00 deve ser rejeitado (BEFORE_OPENING)', () => {
      const date = new Date(2026, 4, 31, 0, 0, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('BEFORE_OPENING');
    });

    test('3:30:00 deve ser rejeitado (BEFORE_OPENING)', () => {
      const date = new Date(2026, 4, 31, 3, 30, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('BEFORE_OPENING');
    });

    test('20:00:00 deve ser rejeitado (AFTER_CLOSING)', () => {
      const date = new Date(2026, 4, 31, 20, 0, 0);
      const result = service.validate(date);
      expect(result.isWithinBusinessHours).toBe(false);
      expect(result.reason).toBe('AFTER_CLOSING');
    });
  });
});
```

#### 2. Testes Unitários - Issue Ticket Use Case

**Arquivo:** `backend/src/application/usecases/__tests__/issue-ticket.usecase.test.ts`

```typescript
import { IssueTicketUseCase } from '../issue-ticket.usecase';
import { TicketStatus, TicketType } from '../../domain/entities/ticket';

describe('IssueTicketUseCase - Business Hours Integration', () => {
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      countIssuedByTypeBetween: jest.fn().mockResolvedValue(0),
      save: jest.fn(),
    };
  });

  describe('Descarte por fora do expediente', () => {
    test('Deve descartar com motivo OUTSIDE_BUSINESS_HOURS às 6:59', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 6, 59, 0));
      const useCase = new IssueTicketUseCase(mockRepository, { 
        now: mockNow, 
        random: () => 0.5 
      });

      const result = await useCase.execute(TicketType.GERAL);

      expect(result.discarded).toBe(true);
      expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
      expect(result.ticket.status).toBe(TicketStatus.DESCARTADA);
    });

    test('Deve descartar com motivo OUTSIDE_BUSINESS_HOURS às 17:00', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 17, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, { 
        now: mockNow, 
        random: () => 0.5 
      });

      const result = await useCase.execute(TicketType.PRIORITARIA);

      expect(result.discarded).toBe(true);
      expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
      expect(result.ticket.status).toBe(TicketStatus.DESCARTADA);
    });

    test('Deve emitir normalmente às 7:00', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 7, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, { 
        now: mockNow, 
        random: () => 0.5 
      });

      const result = await useCase.execute(TicketType.GERAL);

      expect(result.discarded).toBe(false);
      expect(result.discardReason).toBeUndefined();
      expect(result.ticket.status).toBe(TicketStatus.EMITIDA);
    });

    test('Deve emitir normalmente às 16:59', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 16, 59, 59));
      const useCase = new IssueTicketUseCase(mockRepository, { 
        now: mockNow, 
        random: () => 0.5 
      });

      const result = await useCase.execute(TicketType.EXAMES);

      expect(result.discarded).toBe(false);
      expect(result.discardReason).toBeUndefined();
      expect(result.ticket.status).toBe(TicketStatus.EMITIDA);
    });
  });

  describe('Descarte aleatório vs fora do expediente', () => {
    test('Deve priorizar OUTSIDE_BUSINESS_HOURS sobre RANDOM_5_PERCENT', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 18, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, { 
        now: mockNow, 
        random: () => 0.02 // 2% (dentro dos 5% de descarte aleatório)
      });

      const result = await useCase.execute(TicketType.GERAL);

      expect(result.discarded).toBe(true);
      expect(result.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
    });

    test('Deve retornar RANDOM_5_PERCENT quando dentro do expediente', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 10, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, { 
        now: mockNow, 
        random: () => 0.03 // 3% (dentro dos 5% de descarte aleatório)
      });

      const result = await useCase.execute(TicketType.GERAL);

      expect(result.discarded).toBe(true);
      expect(result.discardReason).toBe('RANDOM_5_PERCENT');
    });

    test('Deve não descartar quando fora do 5% e dentro do expediente', async () => {
      const mockNow = jest.fn().mockReturnValue(new Date(2026, 4, 31, 12, 0, 0));
      const useCase = new IssueTicketUseCase(mockRepository, { 
        now: mockNow, 
        random: () => 0.08 // 8% (fora dos 5% de descarte)
      });

      const result = await useCase.execute(TicketType.PRIORITARIA);

      expect(result.discarded).toBe(false);
      expect(result.discardReason).toBeUndefined();
      expect(result.ticket.status).toBe(TicketStatus.EMITIDA);
    });
  });
});
```

#### 3. Testes Unitários - Service Minutes

**Arquivo:** `backend/src/domain/services/__tests__/ticket-flow.service.test.ts`

```typescript
import { TicketFlowService } from '../ticket-flow.service';
import { TicketType } from '../../entities/ticket';

describe('TicketFlowService - calculateServiceMinutes', () => {
  const service = new TicketFlowService();

  describe('SP (Prioritária) - distribuição 10-20 minutos', () => {
    test('Deve gerar valores entre 10 e 20', () => {
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.PRIORITARIA, Math.random);
        expect(minutes).toBeGreaterThanOrEqual(10);
        expect(minutes).toBeLessThanOrEqual(20);
      }
    });

    test('Deve gerar múltiplos valores diferentes (não apenas 2)', () => {
      const values = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.PRIORITARIA, Math.random);
        values.add(minutes);
      }
      expect(values.size).toBeGreaterThan(2);
      console.log(`SP gerou ${values.size} valores diferentes: ${Array.from(values).sort((a, b) => a - b).join(', ')}`);
    });

    test('Deve conter valor 10 (mínimo)', () => {
      let encontrou10 = false;
      for (let i = 0; i < 1000; i++) {
        if (service.calculateServiceMinutes(TicketType.PRIORITARIA, Math.random) === 10) {
          encontrou10 = true;
          break;
        }
      }
      expect(encontrou10).toBe(true);
    });

    test('Deve conter valor 20 (máximo)', () => {
      let encontrou20 = false;
      for (let i = 0; i < 1000; i++) {
        if (service.calculateServiceMinutes(TicketType.PRIORITARIA, Math.random) === 20) {
          encontrou20 = true;
          break;
        }
      }
      expect(encontrou20).toBe(true);
    });
  });

  describe('SG (Geral) - distribuição 2-8 minutos', () => {
    test('Deve gerar valores entre 2 e 8', () => {
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.GERAL, Math.random);
        expect(minutes).toBeGreaterThanOrEqual(2);
        expect(minutes).toBeLessThanOrEqual(8);
      }
    });

    test('Deve gerar múltiplos valores diferentes (não apenas 2)', () => {
      const values = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.GERAL, Math.random);
        values.add(minutes);
      }
      expect(values.size).toBeGreaterThan(2);
      console.log(`SG gerou ${values.size} valores diferentes: ${Array.from(values).sort((a, b) => a - b).join(', ')}`);
    });

    test('Deve conter valor 2 (mínimo)', () => {
      let encontrou2 = false;
      for (let i = 0; i < 1000; i++) {
        if (service.calculateServiceMinutes(TicketType.GERAL, Math.random) === 2) {
          encontrou2 = true;
          break;
        }
      }
      expect(encontrou2).toBe(true);
    });

    test('Deve conter valor 8 (máximo)', () => {
      let encontrou8 = false;
      for (let i = 0; i < 1000; i++) {
        if (service.calculateServiceMinutes(TicketType.GERAL, Math.random) === 8) {
          encontrou8 = true;
          break;
        }
      }
      expect(encontrou8).toBe(true);
    });
  });

  describe('SE (Exames) - 1 min (95%) ou 5 min (5%)', () => {
    test('Deve gerar apenas 1 ou 5 minutos', () => {
      for (let i = 0; i < 100; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.EXAMES, Math.random);
        expect([1, 5]).toContain(minutes);
      }
    });

    test('Deve ter distribuição aproximada de 95% = 1 min, 5% = 5 min', () => {
      const results = { one: 0, five: 0 };

      for (let i = 0; i < 10000; i++) {
        const minutes = service.calculateServiceMinutes(TicketType.EXAMES, Math.random);
        if (minutes === 1) results.one++;
        if (minutes === 5) results.five++;
      }

      const percentOne = (results.one / 10000) * 100;
      const percentFive = (results.five / 10000) * 100;

      // Tolerância: ±5 pontos percentuais
      expect(percentOne).toBeGreaterThan(90);
      expect(percentOne).toBeLessThan(99);
      expect(percentFive).toBeGreaterThan(1);
      expect(percentFive).toBeLessThan(10);

      console.log(`SE: ${percentOne.toFixed(2)}% = 1 min, ${percentFive.toFixed(2)}% = 5 min`);
    });
  });
});
```

#### 4. Testes de Integração

**Arquivo:** `backend/src/__tests__/integration/issue-ticket-with-business-hours.integration.test.ts`

```typescript
import { createApp } from '../../app';
import express from 'express';

describe('Integration - Issue Ticket com Business Hours', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  describe('POST /api/tickets/issue com horários variados', () => {
    test('Deve emitir senha às 10:00 (dentro do expediente)', async () => {
      // Mock de hora: 10:00
      const response = await request(app)
        .post('/api/tickets/issue')
        .send({ type: 'SG' });

      // Esperado: Status 201, discarded = false
      expect(response.status).toBe(201);
      expect(response.body.discarded).toBe(false);
      expect(response.body.discardReason).toBeUndefined();
    });

    test('Deve descartar senha às 18:00 (fora do expediente)', async () => {
      // Mock de hora: 18:00
      const response = await request(app)
        .post('/api/tickets/issue')
        .send({ type: 'SP' });

      // Esperado: Status 201, discarded = true, motivo = OUTSIDE_BUSINESS_HOURS
      expect(response.status).toBe(201);
      expect(response.body.discarded).toBe(true);
      expect(response.body.discardReason).toBe('OUTSIDE_BUSINESS_HOURS');
    });
  });
});
```

### Executar Testes

```bash
# Testes unitários
npm run test -- business-hours.service.test.ts
npm run test -- issue-ticket.usecase.test.ts
npm run test -- ticket-flow.service.test.ts

# Testes de integração
npm run test -- issue-ticket-with-business-hours.integration.test.ts

# Todos os testes
npm run test

# Com coverage
npm run test -- --coverage
```

---

## 📚 Documentação

### Atualização do README.md

**Adicionar seção de Comportamento:**

```markdown
## Comportamento do Sistema

### Expediente de Funcionamento

O sistema opera com expediente comercial de **7h às 17h** (23:59:59). Senhas emitidas fora deste horário são automaticamente descartadas:

- **7:00:00 até 16:59:59:** Senhas são normalmente emitidas
- **00:00:00 até 6:59:59:** Senhas são descartadas (BEFORE_OPENING)
- **17:00:00 até 23:59:59:** Senhas são descartadas (AFTER_CLOSING)

Quando uma senha é descartada por estar fora do horário, o sistema retorna o motivo `OUTSIDE_BUSINESS_HOURS`.

### Tempo Médio de Atendimento (TM)

O tempo de atendimento varia para cada tipo de senha:

| Tipo | TM Médio | Variação | Distribuição |
|------|----------|----------|--------------|
| **SP** (Prioritária) | 15 min | ±5 min | Uniforme (10-20 min) |
| **SG** (Geral) | 5 min | ±3 min | Uniforme (2-8 min) |
| **SE** (Exames) | < 1 min | 1 ou 5 | 95% = 1 min, 5% = 5 min |

Exemplo: Uma senha SP pode levar entre 10 e 20 minutos com igual probabilidade para qualquer valor no intervalo.

### Descarte de Senhas

Senhas podem ser descartadas por dois motivos:

1. **RANDOM_5_PERCENT:** 5% das senhas emitidas dentro do expediente são aleatoriamente descartadas (responsabilidade do cliente em comparecer)
2. **OUTSIDE_BUSINESS_HOURS:** Senhas emitidas fora do horário comercial (7h-17h) são automaticamente descartadas

O motivo do descarte é informado no campo `discardReason` da resposta da API.

### Painel de Chamadas

O painel exibe as **últimas 5 senhas chamadas** para que o cliente acompanhe o atendimento e saiba para qual guichê se dirigir.

### Relatórios

Relatórios podem ser consultados em dois períodos:

- **daily:** Relatório do dia selecionado (7h-17h)
- **monthly:** Relatório do mês inteiro

Os relatórios incluem:
- Quantitativo geral de senhas emitidas, atendidas e descartadas
- Quantitativo por tipo de senha (SP, SG, SE)
- Detalhamento de cada senha com:
  - Numeração (YYMMDD-PPSQ)
  - Tipo
  - Status
  - Data/hora de emissão
  - Data/hora de atendimento (ou vazio se não atendida)
  - Guichê responsável (ou vazio se não atendida)
  - Tempo de atendimento em minutos
```

### Adicionar Tabela de Conformidade

```markdown
## Conformidade com Requisitos

| Requisito | Status | Detalhes |
|-----------|--------|----------|
| Infraestrutura | ✅ 100% | Node.js, Angular, MySQL, Docker Compose |
| 3 Agentes | ✅ 100% | Cliente (Tab 1), Atendente (Tab 2), Relatórios (Tab 3) |
| Tipos de Senha | ✅ 100% | SP, SG, SE |
| Formato YYMMDD-PPSQ | ✅ 100% | Implementado com sequência diária |
| Descarte 5% | ✅ 100% | 5% de descarte aleatório |
| Expediente 7h-17h | ✅ 100% | Senhas fora do horário são descartadas |
| Tempo Médio (TM) | ✅ 100% | SP: 10-20 min, SG: 2-8 min, SE: 1/5 min |
| Painel 5 últimas senhas | ✅ 100% | Endpoint `/api/tickets/overview` |
| Relatórios | ✅ 100% | Daily e Monthly com detalhamento completo |
| Priorização | ✅ 100% | Ciclo SP → SE/SG → SP → SE/SG |
| **TOTAL** | **✅ 100%** | **Todos os requisitos atendidos** |
```

---

## 📋 Timeline de Implementação

### Fase 1: Backend (4-6 horas)

- [ ] **T1:** Criar `BusinessHoursService` (30 min)
  - Arquivo: `backend/src/domain/services/business-hours.service.ts`
  - Validar hora (7h-17h)
  - Testes unitários

- [ ] **T2:** Modificar `IssueTicketUseCase` (1 hora)
  - Integrar `BusinessHoursService`
  - Retornar `discardReason`
  - Testes unitários

- [ ] **T3:** Corrigir `TicketFlowService` (1 hora)
  - Distribuição uniforme SP (10-20)
  - Distribuição uniforme SG (2-8)
  - Testes unitários

- [ ] **T4:** Atualizar modelos do domain (30 min)
  - Adicionar `TicketDiscardReason` type
  - Atualizar interfaces

- [ ] **T5:** Testes de integração backend (1 hora)
  - Testar fluxo completo
  - Casos limite

### Fase 2: Frontend (2-3 horas)

- [ ] **T6:** Atualizar models (`ticket.models.ts`) (30 min)
  - Adicionar `TicketDiscardReason`
  - Adicionar `discardReasonLabel()`

- [ ] **T7:** Modificar `Tab1Page` (1 hora)
  - Exibir motivo do descarte
  - Mensagens customizadas
  - Testes

### Fase 3: Documentação (1 hora)

- [ ] **T8:** Atualizar README.md (1 hora)
  - Comportamento do sistema
  - Tabela de conformidade
  - Exemplos

### Total: 7-10 horas

---

## ✅ Critérios de Aceitação

### Business Hours Validation

- ✅ Senhas emitidas entre 7h:00 e 16h:59 são normalmente emitidas
- ✅ Senhas emitidas antes das 7h são descartadas com motivo `OUTSIDE_BUSINESS_HOURS`
- ✅ Senhas emitidas a partir das 17h são descartadas com motivo `OUTSIDE_BUSINESS_HOURS`
- ✅ Resposta JSON inclui campo `discardReason` quando aplicável
- ✅ Testes cobrem casos limite (6:59, 7:00, 16:59, 17:00)

### Service Minutes Distribution

- ✅ SP gera valores entre 10 e 20 (distribuição uniforme)
- ✅ SG gera valores entre 2 e 8 (distribuição uniforme)
- ✅ SE gera 1 min (95%) ou 5 min (5%)
- ✅ Testes verificam múltiplos valores diferentes (não apenas 2)
- ✅ Testes verificam distribuição estatística

### Frontend Integration

- ✅ Mensagem diferente para descarte por OUTSIDE_BUSINESS_HOURS
- ✅ Mensagem diferente para descarte por RANDOM_5_PERCENT
- ✅ Mensagem clara para sucesso
- ✅ Toast color: warning para descarte, success para emissão normal

### Documentation

- ✅ README.md atualizado com comportamento
- ✅ Tabela de conformidade 100%
- ✅ Exemplos de uso incluídos
- ✅ Inline comments no código

### Coverage

- ✅ Testes unitários com >80% coverage
- ✅ Testes de integração cobrindo fluxo completo
- ✅ Casos limite testados

---

## 🚀 Próximos Passos

1. **Revisar este documento** com a equipe de desenvolvimento
2. **Criar branches** para cada tarefa (T1-T8)
3. **Implementar** seguindo a ordem sugerida (backend primeiro)
4. **Testar** antes de fazer merge
5. **Deploy** em staging e validar comportamento
6. **Merge** para main

---

## 📞 Referências

- **Documento de Requisitos:** Controle de Atendimento - UNINASSAU
- **Repositório:** AyrtonF/MobileTicketsIonic
- **Branch:** main (base) ou nova branch para feature

---

**Versão:** 1.0  
**Última atualização:** 2026-05-31  
**Status:** Pronto para implementação
