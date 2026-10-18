import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import content from '@/content/projectContent.json';
import { useCreatePaper } from '@/api/hooks/mutations';
import { toApiError } from '@/api/errors';
import type { PaperDetail } from '@/api/schemas/papers';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Label, FieldError, FieldHint } from '@/components/ui/Input';
import { SmartCombobox } from './SmartCombobox';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/session/SessionProvider';
import { cn } from '@/lib/cn';

const conferences = content.referenceData.conferences;
const tracks = content.referenceData.tracks;
const keywords = content.referenceData.keywords;

interface AuthorRow {
  authorId: number;
  name: string;
  isCorresponding: boolean;
}

const EMPTY = {
  title: '',
  abstract: '',
  confId: conferences[0]?.confId ?? 1,
  trackId: tracks[0]?.trackId ?? 1,
};

export function AddPaperDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (paper: PaperDetail) => void;
}) {
  const [title, setTitle] = useState(EMPTY.title);
  const [abstract, setAbstract] = useState(EMPTY.abstract);
  const [confId, setConfId] = useState(EMPTY.confId);
  const [trackId, setTrackId] = useState(EMPTY.trackId);
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [keywordIds, setKeywordIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreatePaper();
  const { toast } = useToast();
  const { session } = useSession();
  const signedAuthor = session?.identity?.kind === 'author' ? session.identity : null;

  const confTracks = tracks.filter((track) => track.confId === confId);

  useEffect(() => {
    if (!confTracks.some((track) => track.trackId === trackId)) {
      setTrackId(confTracks[0]?.trackId ?? 1);
    }
  }, [confId, confTracks, trackId]);

  useEffect(() => {
    if (!open || !signedAuthor) return;
    setAuthors((previous) => previous.some((author) => author.authorId === signedAuthor.id)
      ? previous
      : [{ authorId: signedAuthor.id, name: signedAuthor.name, isCorresponding: previous.length === 0 }, ...previous]);
  }, [open, signedAuthor]);

  const reset = (): void => {
    setTitle('');
    setAbstract('');
    setConfId(EMPTY.confId);
    setTrackId(EMPTY.trackId);
    setAuthors([]);
    setKeywordIds([]);
    setErrors({});
  };

  const addAuthor = (authorId: number, name: string): void => {
    if (authors.length >= 10) {
      setErrors((prev) => ({ ...prev, authors: 'A paper can have at most 10 authors.' }));
      return;
    }
    if (authors.some((author) => author.authorId === authorId)) {
      setErrors((prev) => ({ ...prev, authors: 'That author is already on the paper.' }));
      return;
    }
    setAuthors((prev) => [...prev, { authorId, name, isCorresponding: prev.length === 0 }]);
    setErrors((prev) => ({ ...prev, authors: '' }));
  };

  const move = (index: number, delta: number): void => {
    setAuthors((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Enter a title.';
    else if (title.trim().length > 250) next.title = 'Title must be 250 characters or fewer.';
    if (!abstract.trim()) next.abstract = 'Enter an abstract.';
    else if (abstract.trim().length > 1000) next.abstract = 'Abstract must be 1,000 characters or fewer.';
    if (authors.length === 0) next.authors = 'Add at least one author.';
    if (!authors.some((author) => author.isCorresponding)) next.authors = 'Mark one author as corresponding.';
    if (keywordIds.length > 10) next.keywords = 'Choose at most 10 keywords.';
    return next;
  };

  const submit = async (): Promise<void> => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const paper = await create.mutateAsync({
        title: title.trim(),
        abstract: abstract.trim(),
        confId,
        trackId,
        authors: authors.map((author, index) => ({
          authorId: author.authorId,
          authorOrder: index + 1,
          isCorresponding: author.isCorresponding,
        })),
        keywordIds,
      });
      toast('Paper created', { tone: 'success', description: `Paper #${paper.paperId} is live in both databases.` });
      reset();
      onOpenChange(false);
      onCreated?.(paper);
    } catch (error) {
      toast('Could not create the paper', { tone: 'error', description: toApiError(error).message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!create.isPending) onOpenChange(value);
      }}
      title="Add a paper"
      description="Creates the paper in Oracle and Neo4j together."
      size="lg"
      footer={
        <>
          <Button variant="secondary" data-cancel onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={create.isPending}>
            Create paper
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label htmlFor="paper-title" hint={`${title.length}/250`}>Title</Label>
          <Input id="paper-title" value={title} maxLength={250} invalid={Boolean(errors.title)} onChange={(event) => setTitle(event.target.value)} placeholder="A precise paper title" />
          <FieldError>{errors.title}</FieldError>
        </div>
        <div>
          <Label htmlFor="paper-abstract" hint={`${abstract.length}/1000`}>Abstract</Label>
          <Textarea id="paper-abstract" value={abstract} maxLength={1000} invalid={Boolean(errors.abstract)} onChange={(event) => setAbstract(event.target.value)} placeholder="One paragraph describing the contribution." />
          <FieldError>{errors.abstract}</FieldError>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="paper-conf">Conference</Label>
            <select id="paper-conf" value={confId} onChange={(event) => setConfId(Number(event.target.value))} className="h-9 w-full rounded-sm border border-line bg-surface-2 px-2 text-sm text-ink">
              {conferences.map((conf) => (
                <option key={conf.confId} value={conf.confId}>{conf.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="paper-track">Track</Label>
            <select id="paper-track" value={trackId} onChange={(event) => setTrackId(Number(event.target.value))} className="h-9 w-full rounded-sm border border-line bg-surface-2 px-2 text-sm text-ink">
              {confTracks.map((track) => (
                <option key={track.trackId} value={track.trackId}>{track.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="paper-author" hint={`${authors.length}/10`}>Authors, in order</Label>
          <SmartCombobox
            kind="author"
            inputId="paper-author"
            value={null}
            onSelect={(option) => addAuthor(option.id, option.label)}
            placeholder="Search an author to add"
            disabled={authors.length >= 10}
          />
          <FieldError>{errors.authors}</FieldError>
          <ol className="mt-2 divide-y divide-line border-y border-line">
            {authors.map((author, index) => (
              <li key={author.authorId} className="flex items-center gap-2 py-2">
                <span className="w-5 text-right font-mono text-[11px] text-faint">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-small text-ink">{author.name}</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-caption text-muted">
                  <input
                    type="radio"
                    name="corresponding"
                    checked={author.isCorresponding}
                    onChange={() => setAuthors((prev) => prev.map((row) => ({ ...row, isCorresponding: row.authorId === author.authorId })))}
                  />
                  corresponding
                </label>
                <button type="button" aria-label={`Move ${author.name} up`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded-sm p-1 text-faint hover:text-ink disabled:opacity-30">
                  <ArrowUp size={13} strokeWidth={1.5} />
                </button>
                <button type="button" aria-label={`Move ${author.name} down`} disabled={index === authors.length - 1} onClick={() => move(index, 1)} className="rounded-sm p-1 text-faint hover:text-ink disabled:opacity-30">
                  <ArrowDown size={13} strokeWidth={1.5} />
                </button>
                <button type="button" aria-label={`Remove ${author.name}`} disabled={author.authorId === signedAuthor?.id} onClick={() => setAuthors((prev) => prev.filter((row) => row.authorId !== author.authorId))} className="rounded-sm p-1 text-faint hover:text-bad disabled:opacity-30">
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </li>
            ))}
            {authors.length === 0 ? <li className="py-2 text-caption text-faint">No authors added yet.</li> : null}
          </ol>
        </div>

        <div>
          <Label htmlFor="paper-keywords" hint={`${keywordIds.length}/10`}>Keywords</Label>
          <div id="paper-keywords" className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-sm border border-line bg-surface-2 p-2">
            {keywords.map((keyword) => {
              const selected = keywordIds.includes(keyword.keywordId);
              return (
                <button
                  key={keyword.keywordId}
                  type="button"
                  aria-pressed={selected}
                  disabled={!selected && keywordIds.length >= 10}
                  onClick={() => setKeywordIds((prev) => selected ? prev.filter((id) => id !== keyword.keywordId) : [...prev, keyword.keywordId])}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] transition-colors duration-fast disabled:opacity-40',
                    selected ? 'border-ink bg-ink text-bg' : 'border-line text-muted hover:border-line-strong hover:text-ink'
                  )}
                >
                  {selected ? <span className="mr-1">✓</span> : null}
                  {keyword.keyword}
                </button>
              );
            })}
          </div>
          <FieldError>{errors.keywords}</FieldError>
          <FieldHint>Keywords are optional; choose the ones a reviewer would search for.</FieldHint>
        </div>
      </div>
    </Dialog>
  );
}
