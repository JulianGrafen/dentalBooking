import { sendEmail, type SendEmailResult } from '@/lib/email/send-email';
import { buildWaitlistOfferEmail } from '@/lib/appointment-notifications';
import {
  buildPublicWaitlistConfirmUrl,
  createPublicWaitlistToken,
  hashPublicWaitlistToken,
} from '@/lib/server/public-cancel-token';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/utils/supabase/admin';

export interface FreedAppointmentSlot {
  practiceId: string;
  startTime: string;
  endTime: string;
}

export interface WaitlistOfferProcessResult {
  offered: boolean;
  email: SendEmailResult | null;
  error?: string;
}

/**
 * Finds the oldest waiting patient for an exact freed slot, marks the entry as
 * offered, and sends the confirmation email.
 */
export async function processWaitlistOfferForSlot(
  slot: FreedAppointmentSlot,
  origin: string,
): Promise<WaitlistOfferProcessResult> {
  if (!isSupabaseAdminConfigured()) {
    console.warn('[waitlist] SUPABASE_SERVICE_ROLE_KEY fehlt — kein Wartelisten-Angebot möglich');
    return {
      offered: false,
      email: null,
      error: 'SUPABASE_SERVICE_ROLE_KEY fehlt',
    };
  }

  const admin = createSupabaseAdminClient();
  const offerToken = createPublicWaitlistToken();
  const offerTokenHash = hashPublicWaitlistToken(offerToken);

  const { data, error } = await admin.rpc('offer_public_waitlist_for_cancelled_slot', {
    target_practice_id: slot.practiceId,
    freed_start_time: slot.startTime,
    freed_end_time: slot.endTime,
    new_offer_token_hash: offerTokenHash,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('could not find the function') ||
      message.includes('schema cache')
    ) {
      console.error('[waitlist] RPC fehlt — bitte npm run db:push ausführen');
      return {
        offered: false,
        email: null,
        error: 'Wartelisten-RPC fehlt in der Datenbank',
      };
    }

    console.error('[waitlist] offer failed:', error.message);
    return { offered: false, email: null, error: error.message };
  }

  const offer = Array.isArray(data) ? data[0] : data;
  if (!offer?.patient_email) {
    return { offered: false, email: null };
  }

  try {
    const email = await sendEmail(
      buildWaitlistOfferEmail({
        patientEmail: offer.patient_email,
        practiceName: offer.practice_name,
        treatment: offer.treatment_label,
        startTime: offer.start_time,
        endTime: offer.end_time,
        confirmationUrl: buildPublicWaitlistConfirmUrl(origin, offerToken),
      }),
    );

    if (!email.sent) {
      console.warn('[waitlist] E-Mail simuliert:', email.detail);
    }

    return { offered: true, email };
  } catch (emailError) {
    const message =
      emailError instanceof Error ? emailError.message : 'E-Mail konnte nicht gesendet werden';
    console.error('[waitlist] email failed:', message);
    return { offered: true, email: null, error: message };
  }
}
