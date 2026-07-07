import { buildWaitlistOfferEmail } from '@/lib/appointment-notifications';
import { sendEmail, type SendEmailResult } from '@/lib/email/send-email';
import { buildPublicWaitlistConfirmUrl } from '@/lib/server/public-cancel-token';

export interface WaitlistOfferEmailContext {
  practiceName: string;
  patientEmail: string;
  treatmentLabel: string;
  startTime: string;
  endTime: string;
}

export async function sendWaitlistOfferEmail(
  offer: WaitlistOfferEmailContext,
  origin: string,
  token: string,
): Promise<SendEmailResult> {
  return sendEmail(
    buildWaitlistOfferEmail({
      patientEmail: offer.patientEmail,
      practiceName: offer.practiceName,
      treatment: offer.treatmentLabel,
      startTime: offer.startTime,
      endTime: offer.endTime,
      confirmationUrl: buildPublicWaitlistConfirmUrl(origin, token),
    }),
  );
}
