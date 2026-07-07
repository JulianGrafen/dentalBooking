'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  appointmentStatusBadgeVariant,
  appointmentStatusLabel,
} from '@/lib/appointment-status';
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
import { filterAppointmentsByPatientName } from '@/lib/appointment-search';
import { AppointmentManageActions } from '@/components/dashboard/appointment-manage-actions';
import { EmptyState } from '@/components/dashboard/empty-state';
import { PatientSearchInput } from '@/components/dashboard/patient-search-input';

interface AppointmentsTableProps {
  appointments: EncryptedAppointment[];
}

export function AppointmentsTable({ appointments }: AppointmentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const rows = useMemo(() => {
    const decrypted = decryptAppointments(appointments);
    return filterAppointmentsByPatientName(decrypted, searchQuery);
  }, [appointments, searchQuery]);

  const timeFormatter = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      <PatientSearchInput value={searchQuery} onChange={setSearchQuery} />

      {rows.length === 0 ? (
        <EmptyState
          title={hasSearch ? 'Keine Treffer' : 'Keine Termine'}
          description={
            hasSearch
              ? `Kein Termin für „${searchQuery.trim()}“ gefunden.`
              : 'Es sind keine Termine vorhanden.'
          }
        />
      ) : (
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
                    <Badge variant={appointmentStatusBadgeVariant(row.status)}>
                      {appointmentStatusLabel(row.status)}
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
      )}
    </div>
  );
}
