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
import {
  decryptAppointments,
  type EncryptedAppointment,
} from '@/lib/appointment-decrypt';
import { AppointmentManageActions } from '@/components/dashboard/appointment-manage-actions';

interface AppointmentsTableProps {
  appointments: EncryptedAppointment[];
}

export function AppointmentsTable({ appointments }: AppointmentsTableProps) {
  const rows = useMemo(() => decryptAppointments(appointments), [appointments]);

  const timeFormatter = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Uhrzeit</TableHead>
            <TableHead>Patient/in</TableHead>
            <TableHead>Behandlung</TableHead>
            <TableHead>Versicherung</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
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
              <TableCell className="text-right">
                <AppointmentManageActions appointment={row} compact />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
