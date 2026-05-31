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
  discardReasonLabel,
} from '../services/ticket.models';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
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
          const discardMessage = this.discardReasonMessage(result);
          await this.presentToast(
            result.discarded
              ? `Senha ${result.ticket.code} descartada automaticamente. ${discardMessage}`
              : `Senha ${result.ticket.code} emitida com sucesso.`,
            result.discarded ? 'warning' : 'success',
          );
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

  discardReasonMessage(result: IssueTicketResultDto): string {
    if (result.discardReason === 'BEFORE_OPENING') {
      return 'Fora do expediente: antes das 07h.';
    }

    if (result.discardReason === 'AFTER_CLOSING') {
      return 'Fora do expediente: após as 17h.';
    }

    if (result.discardReason === 'RANDOM_5_PERCENT') {
      return 'Regra de descarte de 5% aplicada.';
    }

    return '';
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
