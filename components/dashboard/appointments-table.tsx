'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { decryptPatientData } from '@/lib/crypto';
import { getPrivateKey } from '@/lib/practice-key';

interface EncryptedAppointment {
  id: string;
  encrypted_payload: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'cancelled';
}

interface DecryptedRow {
  id: string;
  patientName: string;
  treatment: string;
  insuranceLabel: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'cancelled';
  error?: string;
}

interface AppointmentsTableProps {
  appointments: EncryptedAppointment[];
}

export function AppointmentsTable({ appointments }: AppointmentsTableProps) {
  const rows = useMemo<DecryptedRow[]>(() => {
    const privateKey = getPrivateKey();
    if (!privateKey) return [];

    return appointments.map((appointment) => {
      try {
        const data = decryptPatientData(appointment.encrypted_payload, privateKey);
        return {
          id: appointment.id,
          patientName: data.name,
          treatment: data.treatment,
          insuranceLabel: data.insuranceType === 'kasse' ? 'Kasse' : 'Privat',
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
        };
      } catch {
        return {
          id: appointment.id,
          patientName: '—',
          treatment: '—',
          insuranceLabel: '—',
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
          error: 'Entschlüsselung fehlgeschlagen',
        };
      }
    });
  }, [appointments]);

  const timeFormatter = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Uhrzeit</TableHead>
          <TableHead>Patient/in</TableHead>
          <TableHead>Behandlung</TableHead>
          <TableHead>Versicherung</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="tabular-nums">
              {timeFormatter.format(new Date(row.start_time))} –{' '}
              {timeFormatter.format(new Date(row.end_time))}
            </TableCell>
            <TableCell className="font-medium">
              {row.error ? (
                <span className="text-destructive">{row.error}</span>
              ) : (
                row.patientName
              )}
            </TableCell>
            <TableCell>{row.treatment}</TableCell>
            <TableCell>{row.insuranceLabel}</TableCell>
            <TableCell>
              <Badge variant={row.status === 'cancelled' ? 'destructive' : 'default'}>
                {row.status === 'cancelled' ? 'Storniert' : 'Gebucht'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
