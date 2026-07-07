import { formatAppointmentTimeRange } from '@/lib/format-datetime';
import type { OutboundEmail } from '@/lib/email/send-email';

export interface AppointmentNotificationContext {
  patientName: string;
  patientEmail: string;
  practiceName: string;
  treatment: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface ConfirmationNotificationContext extends AppointmentNotificationContext {
  cancellationUrl: string;
}

export interface WaitlistOfferNotificationContext {
  patientEmail: string;
  practiceName: string;
  treatment: string;
  startTime: string;
  endTime: string;
  confirmationUrl: string;
}

export interface RescheduleNotificationContext extends AppointmentNotificationContext {
  previousStartTime: string;
  previousEndTime: string;
}

export function buildCancellationEmail(
  ctx: AppointmentNotificationContext,
): OutboundEmail {
  const slot = formatAppointmentTimeRange(ctx.startTime, ctx.endTime);
  const reasonBlock = ctx.reason ? `Grund: ${ctx.reason}\n\n` : '';

  return {
    to: ctx.patientEmail,
    subject: `Terminabsage — ${ctx.practiceName}`,
    body:
      `Guten Tag ${ctx.patientName},\n\n` +
      `leider müssen wir Ihren Termin absagen:\n\n` +
      `Behandlung: ${ctx.treatment}\n` +
      `Termin: ${slot}\n` +
      reasonBlock +
      `Bitte vereinbaren Sie bei Bedarf einen neuen Termin mit uns.\n\n` +
      `Mit freundlichen Grüßen\n` +
      `${ctx.practiceName}`,
  };
}

export function buildRescheduleEmail(
  ctx: RescheduleNotificationContext,
): OutboundEmail {
  const previousSlot = formatAppointmentTimeRange(ctx.previousStartTime, ctx.previousEndTime);
  const newSlot = formatAppointmentTimeRange(ctx.startTime, ctx.endTime);

  return {
    to: ctx.patientEmail,
    subject: `Terminverschiebung — ${ctx.practiceName}`,
    body:
      `Guten Tag ${ctx.patientName},\n\n` +
      `Ihr Termin wurde verschoben:\n\n` +
      `Behandlung: ${ctx.treatment}\n` +
      `Bisheriger Termin: ${previousSlot}\n` +
      `Neuer Termin: ${newSlot}\n\n` +
      `Bitte bestätigen Sie uns kurz, ob der neue Termin für Sie passt.\n\n` +
      `Mit freundlichen Grüßen\n` +
      `${ctx.practiceName}`,
  };
}

export function buildConfirmationEmail(
  ctx: ConfirmationNotificationContext,
): OutboundEmail {
  const slot = formatAppointmentTimeRange(ctx.startTime, ctx.endTime);

  return {
    to: ctx.patientEmail,
    subject: `Terminbestätigung — ${ctx.practiceName}`,
    body:
      `Guten Tag ${ctx.patientName},\n\n` +
      `Ihr Termin wurde von ${ctx.practiceName} bestätigt:\n\n` +
      `Behandlung: ${ctx.treatment}\n` +
      `Termin: ${slot}\n\n` +
      `Bitte erscheinen Sie pünktlich zu Ihrem Termin.\n\n` +
      `Falls Sie den Termin nicht wahrnehmen können, können Sie ihn hier absagen:\n` +
      `${ctx.cancellationUrl}\n\n` +
      `Der Termin wird erst abgesagt, nachdem Sie die Absage auf der Seite bestätigt haben.\n\n` +
      `Mit freundlichen Grüßen\n` +
      `${ctx.practiceName}`,
  };
}

export function buildWaitlistOfferEmail(
  ctx: WaitlistOfferNotificationContext,
): OutboundEmail {
  const slot = formatAppointmentTimeRange(ctx.startTime, ctx.endTime);

  return {
    to: ctx.patientEmail,
    subject: `Termin frei geworden — ${ctx.practiceName}`,
    body:
      `Guten Tag,\n\n` +
      `für Ihren Wartelistenwunsch ist ein Termin frei geworden:\n\n` +
      `Behandlung: ${ctx.treatment}\n` +
      `Termin: ${slot}\n\n` +
      `Bitte bestätigen Sie den Termin über diesen Link:\n` +
      `${ctx.confirmationUrl}\n\n` +
      `Der Termin wird erst verbindlich in den Kalender eingetragen, nachdem Sie ihn auf der Seite bestätigt haben.\n\n` +
      `Mit freundlichen Grüßen\n` +
      `${ctx.practiceName}`,
  };
}
