/**
 * Supabase database types.
 *
 * Mirrors supabase/migrations/*.sql. Once a Supabase project is linked,
 * regenerate with:
 *
 *   supabase gen types typescript --linked > types/database.ts
 *
 * The shape below matches the generator's output so the swap is a no-op
 * for consuming code.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      practices: {
        Row: {
          id: string;
          name: string;
          slug: string;
          public_key: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug?: string | null;
          public_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          public_key?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          practice_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          insurance_type: Database['public']['Enums']['insurance_type'];
          last_visit_date: string | null;
          is_waitlisted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          insurance_type: Database['public']['Enums']['insurance_type'];
          last_visit_date?: string | null;
          is_waitlisted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          insurance_type?: Database['public']['Enums']['insurance_type'];
          last_visit_date?: string | null;
          is_waitlisted?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patients_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: false;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          practice_id: string;
          encrypted_payload: string;
          start_time: string;
          end_time: string;
          status: Database['public']['Enums']['appointment_status'];
          source: Database['public']['Enums']['appointment_source'];
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          encrypted_payload: string;
          start_time: string;
          end_time: string;
          status?: Database['public']['Enums']['appointment_status'];
          source?: Database['public']['Enums']['appointment_source'];
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          encrypted_payload?: string;
          start_time?: string;
          end_time?: string;
          status?: Database['public']['Enums']['appointment_status'];
          source?: Database['public']['Enums']['appointment_source'];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'appointments_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: false;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      insurance_type: 'kasse' | 'privat';
      appointment_status: 'booked' | 'cancelled';
      appointment_source: 'manual' | 'online' | 'recall' | 'smart_fill';
    };
    CompositeTypes: Record<never, never>;
  };
};

// Convenience aliases — keep consuming code free of long index chains.
export type Practice = Database['public']['Tables']['practices']['Row'];
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type InsuranceType = Database['public']['Enums']['insurance_type'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status'];
export type AppointmentSource = Database['public']['Enums']['appointment_source'];
