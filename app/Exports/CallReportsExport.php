<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CallReportsExport implements FromArray, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithTitle, WithColumnFormatting, WithColumnWidths
{
    protected array $items;

    protected array $filters;

    protected array $stats;

    /** @var array<string, string> accountKey => display name */
    protected array $accountMap;

    public function __construct(array $items, array $filters = [], array $stats = [], array $accounts = [])
    {
        $this->items = $items;
        $this->filters = $filters;
        $this->stats = $stats;

        $this->accountMap = [];
        foreach ($accounts as $account) {
            $key = $account['key'] ?? '';
            $display = $account['display'] ?? '';
            if ($key) {
                $this->accountMap[$key] = $display ?: $key;
            }
        }
    }

    public function title(): string
    {
        return 'Call Reports';
    }

    /**
     * Columns matching GoTo Connect Call Reports view:
     *   A  Account
     *   B  Date
     *   C  Answer Time
     *   D  Duration
     *   E  End Time
     *   F  Direction
     *   G  From (Name)
     *   H  From (Number)
     *   I  Participants
     *   J  Participant Details
     *   K  Outcome
     *   L  Conversation ID
     */
    public function headings(): array
    {
        return [
            'Account',
            'Date',
            'Answer Time',
            'Duration',
            'End Time',
            'Direction',
            'From (Name)',
            'From (Number)',
            'Participants',
            'Participant Details',
            'Outcome',
            'Conversation ID',
        ];
    }

    public function array(): array
    {
        return $this->items;
    }

    /**
     * @param  mixed  $item
     */
    public function map($item): array
    {
        $callCreated = $item['callCreated'] ?? null;
        $callAnswered = $item['callAnswered'] ?? null;
        $callEnded = $item['callEnded'] ?? null;

        // Duration in human-readable
        $duration = '';
        if ($callCreated && $callEnded) {
            $secs = max(0, round(strtotime($callEnded) - strtotime($callCreated)));
            $mins = floor($secs / 60);
            $remainSecs = $secs % 60;
            if ($mins > 0) {
                $duration = "{$mins}m {$remainSecs}s";
            } else {
                $duration = "{$remainSecs}s";
            }
        }

        // Resolve account display name
        $accountKey = $item['accountKey'] ?? '';
        $accountDisplay = $this->accountMap[$accountKey] ?? $accountKey;

        // Extract "From" — caller info
        $fromName = '';
        $fromNumber = '';
        $participants = $item['participants'] ?? [];

        // Try top-level caller first
        if (! empty($item['caller'])) {
            $fromName = $item['caller']['name'] ?? '';
            $fromNumber = $item['caller']['number'] ?? '';
        }

        // If no top-level, try first PHONE_NUMBER participant's caller
        if (empty($fromNumber)) {
            foreach ($participants as $p) {
                $type = $p['type'] ?? [];
                if (($type['value'] ?? '') === 'PHONE_NUMBER') {
                    $fromName = $type['caller']['name'] ?? $fromName;
                    $fromNumber = $type['caller']['number'] ?? $fromNumber;
                    break;
                }
            }
        }

        // Build participant summary (like GoTo webapp: "LCF 3795-0031 Phone 1")
        $participantSummary = $this->formatParticipantSummary($participants);
        $participantDetails = $this->formatParticipantDetails($participants);

        return [
            $accountDisplay,
            $callCreated ? date('M j, Y, g:i A', strtotime($callCreated)) : '',
            $callAnswered ? date('g:i:s A', strtotime($callAnswered)) : '',
            $duration,
            $callEnded ? date('g:i:s A', strtotime($callEnded)) : '',
            ucfirst(strtolower($item['direction'] ?? '')),
            $fromName ? "{$fromNumber}: {$fromName}" : $fromNumber,
            $fromNumber,
            $participantSummary,
            $participantDetails,
            $item['callerOutcome'] ?? '',
            $item['conversationSpaceId'] ?? '',
        ];
    }

    /**
     * Short participant line like GoTo shows: "LCF 3795-0031 Phone 1" or "+1 307 340 1863 + 2 more"
     */
    protected function formatParticipantSummary(array $participants): string
    {
        if (empty($participants)) {
            return '';
        }

        $names = [];
        foreach ($participants as $p) {
            $type = $p['type'] ?? [];
            $typeValue = $type['value'] ?? '';
            $name = $type['name'] ?? $p['name'] ?? '';
            $number = $type['number'] ?? $p['number'] ?? '';
            $ext = $type['extensionNumber'] ?? '';

            if ($name) {
                $names[] = $ext ? "{$name} ext. {$ext}" : $name;
            } elseif ($number) {
                $names[] = $number;
            } elseif ($typeValue) {
                $names[] = $typeValue;
            }
        }

        if (empty($names)) {
            return '';
        }

        $first = $names[0];
        $remaining = count($names) - 1;

        if ($remaining > 0) {
            return "{$first} + {$remaining} more";
        }

        return $first;
    }

    /**
     * Full participant details, one per line.
     */
    protected function formatParticipantDetails(array $participants): string
    {
        if (empty($participants)) {
            return '';
        }

        $lines = [];
        foreach ($participants as $p) {
            $type = $p['type'] ?? [];
            $typeValue = $type['value'] ?? 'UNKNOWN';
            $ext = $type['extensionNumber'] ?? '';

            $label = match ($typeValue) {
                'PHONE_NUMBER' => 'Phone',
                'LINE' => 'Line',
                'VIRTUAL_PARTICIPANT' => 'Virtual',
                default => $typeValue,
            };

            $parts = [];
            if ($typeValue === 'PHONE_NUMBER') {
                $callerName = $type['caller']['name'] ?? '';
                $callerNum = $type['caller']['number'] ?? '';
                $name = $type['name'] ?? '';
                $number = $type['number'] ?? '';
                if ($callerName) {
                    $parts[] = $callerName;
                }
                if ($callerNum) {
                    $parts[] = $callerNum;
                }
                if ($name && $name !== $callerName) {
                    $parts[] = '→ ' . $name;
                }
                if ($number && $number !== $callerNum) {
                    $parts[] = $number;
                }
            } else {
                $name = $type['name'] ?? $p['name'] ?? '';
                $number = $type['number'] ?? $p['number'] ?? '';
                if ($name) {
                    $parts[] = $name;
                }
                if ($number) {
                    $parts[] = $number;
                }
            }
            if ($ext) {
                $parts[] = 'ext. ' . $ext;
            }

            $detail = implode(' / ', $parts);
            $lines[] = $label . ': ' . ($detail ?: '—');
        }

        return implode("\n", $lines);
    }

    public function columnFormats(): array
    {
        return [];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 22,
            'B' => 24,
            'I' => 30,
            'J' => 45,
            'L' => 28,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = count($this->items) + 1;
        $lastCol = 'L';

        // ── Header row ──────────────────────────────────────────────
        $sheet->getStyle("A1:{$lastCol}1")->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['argb' => 'FFFFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF1E3A5F'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        // ── Data rows ───────────────────────────────────────────────
        if ($lastRow > 1) {
            $sheet->getStyle("A2:{$lastCol}{$lastRow}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['argb' => 'FFD0D0D0'],
                    ],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_TOP,
                ],
            ]);

            // Text wrap for participant details
            $sheet->getStyle("J2:J{$lastRow}")->getAlignment()->setWrapText(true);

            // Bold account column
            $sheet->getStyle("A2:A{$lastRow}")->applyFromArray([
                'font' => ['bold' => true],
            ]);

            // Alternate row colouring
            for ($row = 2; $row <= $lastRow; $row++) {
                if ($row % 2 === 0) {
                    $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => 'FFF5F7FA'],
                        ],
                    ]);
                }
            }

            // Colour-code Direction column (F)
            for ($row = 2; $row <= $lastRow; $row++) {
                $dir = strtolower(trim($sheet->getCell("F{$row}")->getValue() ?? ''));
                if ($dir === 'inbound') {
                    $sheet->getStyle("F{$row}")->applyFromArray([
                        'font' => ['color' => ['argb' => 'FF1D6FD0'], 'bold' => true],
                    ]);
                } elseif ($dir === 'outbound') {
                    $sheet->getStyle("F{$row}")->applyFromArray([
                        'font' => ['color' => ['argb' => 'FF16A34A'], 'bold' => true],
                    ]);
                }
            }

            // Colour-code Outcome column (K)
            for ($row = 2; $row <= $lastRow; $row++) {
                $outcome = $sheet->getCell("K{$row}")->getValue();
                if ($outcome === 'NORMAL') {
                    $sheet->getStyle("K{$row}")->applyFromArray([
                        'font' => ['color' => ['argb' => 'FF16A34A']],
                    ]);
                } elseif (in_array($outcome, ['MISSED', 'NO_ANSWER'])) {
                    $sheet->getStyle("K{$row}")->applyFromArray([
                        'font' => ['color' => ['argb' => 'FFDC2626'], 'bold' => true],
                    ]);
                }
            }
        }

        // ── Summary section ─────────────────────────────────────────
        $summaryStartRow = $lastRow + 2;

        $sheet->setCellValue("A{$summaryStartRow}", 'REPORT SUMMARY');
        $sheet->getStyle("A{$summaryStartRow}:B{$summaryStartRow}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FF1E3A5F']],
        ]);
        $sheet->mergeCells("A{$summaryStartRow}:B{$summaryStartRow}");

        $r = $summaryStartRow + 1;

        // Selected accounts
        $selectedAccounts = $this->filters['selectedAccounts'] ?? [];
        $sheet->setCellValue("A{$r}", 'Accounts:');
        if (! empty($selectedAccounts)) {
            $accountNames = array_map(fn ($k) => $this->accountMap[$k] ?? $k, $selectedAccounts);
            $sheet->setCellValue("B{$r}", implode(', ', $accountNames));
        } else {
            $sheet->setCellValue("B{$r}", 'All Accounts');
        }
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        $sheet->setCellValue("A{$r}", 'Date Range:');
        $sheet->setCellValue("B{$r}", ($this->filters['startTime'] ?? '—') . ' to ' . ($this->filters['endTime'] ?? '—'));
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        // Filters
        $applied = [];
        if (! empty($this->filters['direction'])) {
            $applied[] = 'Direction: ' . $this->filters['direction'];
        }
        if (! empty($this->filters['search'])) {
            $applied[] = 'Search: "' . $this->filters['search'] . '"';
        }
        if (! empty($applied)) {
            $sheet->setCellValue("A{$r}", 'Filters:');
            $sheet->setCellValue("B{$r}", implode(' | ', $applied));
            $sheet->getStyle("A{$r}")->getFont()->setBold(true);
            $r++;
        }

        $sheet->setCellValue("A{$r}", 'Total Calls:');
        $sheet->setCellValue("B{$r}", $this->stats['total'] ?? count($this->items));
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        $sheet->setCellValue("A{$r}", 'Inbound:');
        $sheet->setCellValue("B{$r}", $this->stats['inbound'] ?? 0);
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        $sheet->setCellValue("A{$r}", 'Outbound:');
        $sheet->setCellValue("B{$r}", $this->stats['outbound'] ?? 0);
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        $sheet->setCellValue("A{$r}", 'Missed/No Answer:');
        $sheet->setCellValue("B{$r}", $this->stats['missed'] ?? 0);
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        $sheet->setCellValue("A{$r}", 'Avg Duration:');
        $sheet->setCellValue("B{$r}", $this->stats['avgDuration'] ?? '—');
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        $totalParticipants = 0;
        foreach ($this->items as $item) {
            $totalParticipants += count($item['participants'] ?? []);
        }
        $sheet->setCellValue("A{$r}", 'Total Participants:');
        $sheet->setCellValue("B{$r}", $totalParticipants);
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        $sheet->setCellValue("A{$r}", 'Generated:');
        $sheet->setCellValue("B{$r}", now()->format('Y-m-d H:i:s T'));
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);

        $sheet->setAutoFilter("A1:{$lastCol}1");
        $sheet->freezePane('A2');

        return [];
    }
}
