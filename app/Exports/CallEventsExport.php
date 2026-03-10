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

class CallEventsExport implements FromArray, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithTitle, WithColumnFormatting, WithColumnWidths
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

        // Build accountKey => display name map
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
        return 'Call Events Report';
    }

    /**
     * Column layout (A–O):
     *   A  Account
     *   B  Date
     *   C  Time Started
     *   D  Time Ended
     *   E  Duration (seconds)
     *   F  Direction
     *   G  Caller Name
     *   H  Caller Number
     *   I  Destination Name
     *   J  Destination Number
     *   K  Participant Count
     *   L  Participant Details
     *   M  Call Initiator
     *   N  Caller Outcome
     *   O  Conversation ID
     */
    public function headings(): array
    {
        return [
            'Account',
            'Date',
            'Time Started',
            'Time Ended',
            'Duration (seconds)',
            'Direction',
            'Caller Name',
            'Caller Number',
            'Destination Name',
            'Destination Number',
            'Participant Count',
            'Participant Details',
            'Call Initiator',
            'Caller Outcome',
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
        $callEnded = $item['callEnded'] ?? null;

        // Duration in seconds
        $durationSecs = 0;
        if ($callCreated && $callEnded) {
            $durationSecs = max(0, round(strtotime($callEnded) - strtotime($callCreated)));
        }

        // Extract caller & destination from participants
        $callerName = '';
        $callerNumber = '';
        $destName = '';
        $destNumber = '';

        $participants = $item['participants'] ?? [];
        foreach ($participants as $p) {
            $type = $p['type'] ?? [];
            $typeValue = $type['value'] ?? '';

            if ($typeValue === 'PHONE_NUMBER') {
                $destName = $type['name'] ?? '';
                $destNumber = $type['number'] ?? '';
                $callerName = $type['caller']['name'] ?? '';
                $callerNumber = $type['caller']['number'] ?? '';
            }
        }

        // Fallback to top-level caller
        if (empty($callerName) && isset($item['caller'])) {
            $callerName = $item['caller']['name'] ?? '';
            $callerNumber = $item['caller']['number'] ?? '';
        }

        // Resolve account display name
        $accountKey = $item['accountKey'] ?? '';
        $accountDisplay = $this->accountMap[$accountKey] ?? $accountKey;

        // Build detailed participant lines
        $participantDetails = $this->formatParticipantDetails($participants);

        return [
            $accountDisplay,
            $callCreated ? date('Y-m-d', strtotime($callCreated)) : '',
            $callCreated ? date('H:i:s', strtotime($callCreated)) : '',
            $callEnded ? date('H:i:s', strtotime($callEnded)) : '',
            $durationSecs,
            $item['direction'] ?? '',
            $callerName,
            $callerNumber,
            $destName,
            $destNumber,
            count($participants),
            $participantDetails,
            $item['callInitiator'] ?? '',
            $item['callerOutcome'] ?? '',
            $item['conversationSpaceId'] ?? '',
        ];
    }

    /**
     * Format participant details as multi-line text for a single cell.
     *
     * Each participant gets one line:
     *   Phone: Name / +15551234567 / ext. 101
     *   Line: Name / ext. 202
     *   Virtual: Auto Attendant
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

            // Determine label based on type
            $label = match ($typeValue) {
                'PHONE_NUMBER' => 'Phone',
                'LINE' => 'Line',
                'VIRTUAL_PARTICIPANT' => 'Virtual',
                default => $typeValue,
            };

            // Collect name/number parts
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
        return [
            'B' => NumberFormat::FORMAT_DATE_YYYYMMDD2,
            'E' => NumberFormat::FORMAT_NUMBER,
            'K' => NumberFormat::FORMAT_NUMBER,
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 22,  // Account
            'L' => 45,  // Participant Details
            'O' => 28,  // Conversation ID
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = count($this->items) + 1;
        $lastCol = 'O';

        // ── Header row styling ──────────────────────────────────────
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

        // Header row height
        $sheet->getRowDimension(1)->setRowHeight(28);

        // ── Data rows styling ───────────────────────────────────────
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

            // Enable text wrap for the Participant Details column (L)
            $sheet->getStyle("L2:L{$lastRow}")->getAlignment()->setWrapText(true);

            // Account column left-aligned + bold
            $sheet->getStyle("A2:A{$lastRow}")->applyFromArray([
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
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
                $direction = $sheet->getCell("F{$row}")->getValue();
                if ($direction === 'INBOUND') {
                    $sheet->getStyle("F{$row}")->applyFromArray([
                        'font' => ['color' => ['argb' => 'FF1D6FD0'], 'bold' => true],
                    ]);
                } elseif ($direction === 'OUTBOUND') {
                    $sheet->getStyle("F{$row}")->applyFromArray([
                        'font' => ['color' => ['argb' => 'FF16A34A'], 'bold' => true],
                    ]);
                }
            }

            // Colour-code Outcome column (N)
            for ($row = 2; $row <= $lastRow; $row++) {
                $outcome = $sheet->getCell("N{$row}")->getValue();
                if ($outcome === 'NORMAL') {
                    $sheet->getStyle("N{$row}")->applyFromArray([
                        'font' => ['color' => ['argb' => 'FF16A34A']],
                    ]);
                } elseif (in_array($outcome, ['MISSED', 'NO_ANSWER'])) {
                    $sheet->getStyle("N{$row}")->applyFromArray([
                        'font' => ['color' => ['argb' => 'FFDC2626'], 'bold' => true],
                    ]);
                }
            }
        }

        // ── Summary section below data ──────────────────────────────
        $summaryStartRow = $lastRow + 2;

        // Summary header
        $sheet->setCellValue("A{$summaryStartRow}", 'REPORT SUMMARY');
        $sheet->getStyle("A{$summaryStartRow}:B{$summaryStartRow}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FF1E3A5F']],
        ]);
        $sheet->mergeCells("A{$summaryStartRow}:B{$summaryStartRow}");

        $r = $summaryStartRow + 1;

        // Selected accounts
        $selectedAccounts = $this->filters['selectedAccounts'] ?? [];
        if (! empty($selectedAccounts)) {
            $sheet->setCellValue("A{$r}", 'Accounts:');
            $accountNames = [];
            foreach ($selectedAccounts as $key) {
                $accountNames[] = $this->accountMap[$key] ?? $key;
            }
            $sheet->setCellValue("B{$r}", implode(', ', $accountNames));
            $sheet->getStyle("A{$r}")->getFont()->setBold(true);
            $r++;
        } else {
            $sheet->setCellValue("A{$r}", 'Accounts:');
            $sheet->setCellValue("B{$r}", 'All Accounts');
            $sheet->getStyle("A{$r}")->getFont()->setBold(true);
            $r++;
        }

        // Date range
        $sheet->setCellValue("A{$r}", 'Date Range:');
        $sheet->setCellValue("B{$r}", ($this->filters['startTime'] ?? '—') . ' to ' . ($this->filters['endTime'] ?? '—'));
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        // Applied filters
        $appliedFilters = [];
        if (! empty($this->filters['direction'])) {
            $appliedFilters[] = 'Direction: ' . $this->filters['direction'];
        }
        if (! empty($this->filters['outcome'])) {
            $appliedFilters[] = 'Outcome: ' . $this->filters['outcome'];
        }
        if (! empty($this->filters['search'])) {
            $appliedFilters[] = 'Search: "' . $this->filters['search'] . '"';
        }
        if (! empty($appliedFilters)) {
            $sheet->setCellValue("A{$r}", 'Filters:');
            $sheet->setCellValue("B{$r}", implode(' | ', $appliedFilters));
            $sheet->getStyle("A{$r}")->getFont()->setBold(true);
            $r++;
        }

        // Total calls
        $sheet->setCellValue("A{$r}", 'Total Calls:');
        $sheet->setCellValue("B{$r}", $this->stats['total'] ?? count($this->items));
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        // Inbound
        $sheet->setCellValue("A{$r}", 'Inbound:');
        $sheet->setCellValue("B{$r}", $this->stats['inbound'] ?? 0);
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        // Outbound
        $sheet->setCellValue("A{$r}", 'Outbound:');
        $sheet->setCellValue("B{$r}", $this->stats['outbound'] ?? 0);
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        // Missed
        $sheet->setCellValue("A{$r}", 'Missed/No Answer:');
        $sheet->setCellValue("B{$r}", $this->stats['missed'] ?? 0);
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        // Avg duration
        $sheet->setCellValue("A{$r}", 'Avg Duration:');
        $sheet->setCellValue("B{$r}", $this->stats['avgDuration'] ?? '—');
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        // Total participants
        $totalParticipants = 0;
        foreach ($this->items as $item) {
            $totalParticipants += count($item['participants'] ?? []);
        }
        $sheet->setCellValue("A{$r}", 'Total Participants:');
        $sheet->setCellValue("B{$r}", $totalParticipants);
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);
        $r++;

        // Generated at
        $sheet->setCellValue("A{$r}", 'Generated:');
        $sheet->setCellValue("B{$r}", now()->format('Y-m-d H:i:s T'));
        $sheet->getStyle("A{$r}")->getFont()->setBold(true);

        // Auto-filter on header
        $sheet->setAutoFilter("A1:{$lastCol}1");

        // Freeze header row
        $sheet->freezePane('A2');

        return [];
    }
}
