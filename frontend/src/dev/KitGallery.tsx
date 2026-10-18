import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ScoreSlider } from '@/components/ui/ScoreSlider';
import { Stat } from '@/components/ui/Stat';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/ErrorState';

export function KitGallery() {
  const [scope, setScope] = useState<'default' | 'inverse'>('default');
  const [inputValue, setInputValue] = useState('Sample input value');
  const [checked, setChecked] = useState(true);
  const [sliderValue, setSliderValue] = useState(8.5);
  const [segmented, setSegmented] = useState('demo');

  return (
    <div data-theme={scope} className="min-h-screen bg-bg text-ink p-8 transition-colors duration-fast">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-caption text-faint hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <h1 className="text-display text-ink">UI Kit Gallery</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-caption text-faint">Scope Preview:</span>
            <SegmentedControl
              label="Theme scope"
              value={scope}
              onChange={(val) => setScope(val as 'default' | 'inverse')}
              options={[
                { value: 'default', label: 'Default (Dark)' },
                { value: 'inverse', label: 'Inverse (Light)' },
              ]}
            />
          </div>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader title="Buttons" description="Primary, secondary, ghost, danger, and icon variants" />
          <CardBody className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="secondary"><Download className="h-4 w-4" /> With Icon</Button>
            <Button variant="ghost" size="sm">Small</Button>
          </CardBody>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader title="Badges & Statuses" description="Categorical and state indicators" />
          <CardBody className="flex flex-wrap gap-3">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="ok">Accepted</Badge>
            <Badge tone="warn">Under Review</Badge>
            <Badge tone="bad">Rejected</Badge>
            <Badge tone="accent">Highlighted</Badge>
          </CardBody>
        </Card>

        {/* Form Controls */}
        <Card>
          <CardHeader title="Form Controls" description="Inputs, checkboxes, segmented controls, and sliders" />
          <CardBody className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="kit-text-input" hint="Supporting helper text">Text Input</Label>
                <Input
                  id="kit-text-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="kit-invalid-input">Input with Error</Label>
                <Input
                  id="kit-invalid-input"
                  value="Invalid payload"
                  invalid
                  readOnly
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Checkbox
                label="Interactive Checkbox"
                checked={checked}
                onChange={setChecked}
              />
              <div className="w-64 space-y-1">
                <span className="text-caption text-faint">Reviewer Score ({sliderValue})</span>
                <ScoreSlider
                  value={sliderValue}
                  onChange={setSliderValue}
                />
              </div>
              <SegmentedControl
                label="Dataset"
                value={segmented}
                onChange={setSegmented}
                options={[
                  { value: 'demo', label: 'Demo (110 papers)' },
                  { value: 'scale', label: 'Scale (1.5k papers)' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader title="Statistics" description="KPI metrics with trend and subtitle" />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Stat caption="Total Papers" value="110" hint="Seed baseline dataset" />
            <Stat caption="Conflict Pairs" value="8" hint="Flagged via co-authorship" />
            <Stat caption="Parity Status" value="100%" hint="13/13 tables verified" />
          </CardBody>
        </Card>

        {/* Empty & Error States */}
        <Card>
          <CardHeader title="Empty & Error States" description="Recovery-focused feedback" />
          <CardBody className="grid gap-6 sm:grid-cols-2">
            <EmptyState
              title="No Papers Found"
              hint="Adjust your search filters to view conference submissions."
              action={<Button variant="secondary"><RefreshCw className="h-4 w-4" /> Reset Filters</Button>}
            />
            <ErrorState
              error={new Error('The backend took longer than 15 seconds to reply.')}
              onRetry={() => {}}
            />
          </CardBody>
        </Card>

        {/* Loading Skeletons */}
        <Card>
          <CardHeader title="Skeleton Placeholders" description="Accessible loading shimmer blocks" />
          <CardBody className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
