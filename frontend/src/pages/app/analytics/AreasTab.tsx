import { Download } from 'lucide-react';
import type { Institutions } from '@/api/schemas/analytics';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { exportToCsv } from '@/lib/csv';
import { num } from '@/lib/format';

export function AreasTab({ data, loading }: { data: Institutions | undefined; loading: boolean }) {
  const areas = data?.researchAreas ?? [];
  const tracks = data?.tracks ?? [];
  const maxArea = Math.max(1, ...areas.map((area) => area.paperCount));

  if (loading) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Papers per research area"
          description={`${num(data?.totalPapers ?? 0)} papers grouped by keyword area.`}
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportToCsv('research-areas', ['area', 'papers', 'share'],
                areas.map((area) => [area.areaName, area.paperCount, area.percentage]))}
            >
              <Download size={14} strokeWidth={1.5} /> CSV
            </Button>
          }
        />
        <CardBody className="p-0">
          <table className="w-full text-left text-[12px]" aria-label="Papers per research area">
            <thead>
              <tr className="bg-surface-2">
                <th scope="col" className="border-b border-line px-4 py-2.5 text-caption font-medium text-muted">Research area</th>
                <th scope="col" className="border-b border-line px-4 py-2.5 text-right text-caption font-medium text-muted">Papers</th>
                <th scope="col" className="border-b border-line px-4 py-2.5 text-right text-caption font-medium text-muted">Share</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.areaName} className="border-b border-line/60">
                  <td className="px-4 py-2.5">
                    <span className="block text-ink">{area.areaName}</span>
                    <span className="mt-1 block h-1 w-full max-w-[180px] rounded-full bg-surface-3" aria-hidden>
                      <span className="block h-full rounded-full bg-ink/70" style={{ width: `${Math.round((area.paperCount / maxArea) * 100)}%` }} />
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11px] text-ink tabular">{num(area.paperCount)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11px] text-muted tabular">{area.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Track breakdown"
          description={`${tracks.length} tracks across every conference.`}
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportToCsv('tracks', ['trackId', 'track', 'conference', 'papers'],
                tracks.map((track) => [track.trackId, track.trackName, track.conferenceName, track.paperCount]))}
            >
              <Download size={14} strokeWidth={1.5} /> CSV
            </Button>
          }
        />
        <CardBody className="p-0">
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-left text-[12px]" aria-label="Papers per track">
              <thead>
                <tr className="sticky top-0 z-10 bg-surface-2">
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-caption font-medium text-muted">Track</th>
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-caption font-medium text-muted">Conference</th>
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-right text-caption font-medium text-muted">Papers</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track) => (
                  <tr key={track.trackId} className="border-b border-line/60">
                    <td className="px-4 py-2.5 text-ink">{track.trackName}</td>
                    <td className="px-4 py-2.5 text-muted">{track.conferenceAcronym ?? track.conferenceName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-ink tabular">{num(track.paperCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
