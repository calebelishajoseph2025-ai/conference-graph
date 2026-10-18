import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, FileText, LayoutDashboard, ClipboardCheck, Shield, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { apiFetch } from '@/api/client';
import { toApiError } from '@/api/errors';
import { useAuthor, useReviewer } from '@/api/hooks/queries';
import { useSession } from '@/session/SessionProvider';
import { PERSONAS, type PersonaId } from '@/session/personas';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { SmartCombobox } from '@/components/domain/SmartCombobox';
import type { ComboOption } from '@/components/ui/Combobox';
import { Trace } from './Trace';

interface IdentityState {
  id: number;
  name: string;
}

async function verifyAdminToken(token: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await apiFetch('/admin/reset-neo4j', {
      schema: z.unknown(),
      envelope: 'wrapped',
      method: 'POST',
      body: { confirm: false },
      adminToken: token,
    });
    return { ok: true };
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 400) return { ok: true };
    if (apiError.status === 403) return { ok: false, message: 'That token was rejected. Check it and try again.' };
    if (apiError.status === 500) return { ok: false, message: 'The server has no admin token configured.' };
    return { ok: false, message: apiError.message };
  }
}

function CardShell({
  featured,
  children,
  id,
}: {
  featured?: boolean;
  children: ReactNode;
  id: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={
        featured
          ? 'hairline flex flex-col rounded-xl border border-line-strong bg-surface p-5'
          : 'flex flex-col rounded-xl border border-line bg-surface p-5'
      }
    >
      {children}
    </section>
  );
}

const ICONS: Record<PersonaId, JSX.Element> = {
  evaluator: <Compass size={17} strokeWidth={1.5} />,
  chair: <LayoutDashboard size={17} strokeWidth={1.5} />,
  reviewer: <ClipboardCheck size={17} strokeWidth={1.5} />,
  author: <FileText size={17} strokeWidth={1.5} />,
  admin: <Shield size={17} strokeWidth={1.5} />,
};

export function ChooseView() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextParam = params.get('next');
  const next = nextParam && nextParam.startsWith('/app') ? nextParam : null;

  const reviewerDefault = useReviewer(2);
  const authorDefault = useAuthor(1);
  const [reviewer, setReviewer] = useState<IdentityState | null>(null);
  const [author, setAuthor] = useState<IdentityState | null>(null);
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (reviewerDefault.data) setReviewer({ id: reviewerDefault.data.reviewerId, name: reviewerDefault.data.name });
  }, [reviewerDefault.data]);
  useEffect(() => {
    if (authorDefault.data) setAuthor({ id: authorDefault.data.authorId, name: authorDefault.data.name });
  }, [authorDefault.data]);

  const enter = (persona: PersonaId, identity?: IdentityState, adminToken?: string): void => {
    signIn(persona, identity ? { kind: persona === 'author' ? 'author' : 'reviewer', id: identity.id, name: identity.name } : undefined, adminToken);
    navigate(next ?? PERSONAS[persona].landing);
  };

  const submitAdmin = async (): Promise<void> => {
    setTokenError('');
    if (!token.trim()) {
      setTokenError('Enter the admin token.');
      return;
    }
    setVerifying(true);
    const result = await verifyAdminToken(token.trim());
    setVerifying(false);
    if (!result.ok) {
      setTokenError(result.message);
      return;
    }
    enter('admin', undefined, token.trim());
  };

  return (
    <section id="choose" className="scroll-mt-16 py-20 lg:py-[120px]">
      <div className="relative mx-auto max-w-content px-6">
      <Trace />
      <div className="text-center">
        <p className="text-caption text-muted">Demo sign-in</p>
        <h2 className="mt-3 text-[clamp(26px,3vw,36px)] font-semibold tracking-[-0.03em] text-ink">Choose a view</h2>
        <p className="mx-auto mt-3 max-w-[58ch] text-small text-muted">
          Each view is a pre-built workspace with its own navigation and permissions. Pick the one you want to show.
        </p>
      </div>
      <div className="mt-10 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <CardShell id="view-evaluator" featured>
          <div className="flex items-center justify-between">
            <div className="text-ink">{ICONS.evaluator}</div>
            <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              Recommended
            </span>
          </div>
          <h3 id="view-evaluator" className="mt-3 text-[16px] font-semibold text-ink">Evaluator</h3>
          <p className="mt-2 flex-1 text-small text-muted">A guided walkthrough of the best evidence, in order. Built for the demo and the viva.</p>
          <Button className="mt-5 w-full whitespace-nowrap text-[13px]" onClick={() => enter('evaluator')}>
            Start walkthrough
            <ArrowRight size={14} strokeWidth={1.5} />
          </Button>
        </CardShell>

        <CardShell id="view-chair">
          <div className="text-ink">{ICONS.chair}</div>
          <h3 id="view-chair" className="mt-3 text-[16px] font-semibold text-ink">Program chair</h3>
          <p className="mt-2 flex-1 text-small text-muted">Run the conference: papers, reviewer assignment, analytics.</p>
          <Button className="mt-5 w-full text-[13px]" variant="secondary" onClick={() => enter('chair')}>
            Open chair view
          </Button>
        </CardShell>

        <CardShell id="view-reviewer">
          <div className="text-ink">{ICONS.reviewer}</div>
          <h3 id="view-reviewer" className="mt-3 text-[16px] font-semibold text-ink">Reviewer</h3>
          <p className="mt-2 text-small text-muted">Your assigned papers and a review form.</p>
          <div className="mt-3 flex-1">
            <Label htmlFor="reviewer-identity" hint={reviewerDefault.isError ? 'Lookup failed' : undefined}>
              Identity
            </Label>
            <SmartCombobox
              kind="reviewer"
              inputId="reviewer-identity"
              value={reviewer ? { id: reviewer.id, label: reviewer.name } : null}
              onSelect={(option: ComboOption) => setReviewer({ id: option.id, name: option.label })}
              onClear={() => setReviewer(null)}
              placeholder="Search reviewers"
              disabled={reviewerDefault.isError && !reviewer}
            />
          </div>
          <Button className="mt-4 w-full text-[13px]" variant="secondary" disabled={!reviewer} onClick={() => reviewer && enter('reviewer', reviewer)}>
            Open reviewer view
          </Button>
        </CardShell>

        <CardShell id="view-author">
          <div className="text-ink">{ICONS.author}</div>
          <h3 id="view-author" className="mt-3 text-[16px] font-semibold text-ink">Author</h3>
          <p className="mt-2 text-small text-muted">Your papers, statuses and collaboration network.</p>
          <div className="mt-3 flex-1">
            <Label htmlFor="author-identity" hint={authorDefault.isError ? 'Lookup failed' : undefined}>
              Identity
            </Label>
            <SmartCombobox
              kind="author"
              inputId="author-identity"
              value={author ? { id: author.id, label: author.name } : null}
              onSelect={(option: ComboOption) => setAuthor({ id: option.id, name: option.label })}
              onClear={() => setAuthor(null)}
              placeholder="Search authors"
              disabled={authorDefault.isError && !author}
            />
          </div>
          <Button className="mt-4 w-full text-[13px]" variant="secondary" disabled={!author} onClick={() => author && enter('author', author)}>
            Open author view
          </Button>
        </CardShell>

        <CardShell id="view-admin">
          <div className="text-ink">{ICONS.admin}</div>
          <h3 id="view-admin" className="mt-3 text-[16px] font-semibold text-ink">Admin</h3>
          <p className="mt-2 text-small text-muted">Everything, plus destructive operations.</p>
          <form
            className="mt-3 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAdmin();
            }}
          >
            <Label htmlFor="admin-token">Admin token</Label>
            <Input
              id="admin-token"
              type="password"
              autoComplete="off"
              value={token}
              placeholder="Paste the token"
              invalid={Boolean(tokenError)}
              onChange={(event) => setToken(event.target.value)}
            />
            {tokenError ? <p className="mt-1.5 text-[12px] text-bad">{tokenError}</p> : null}
            <Button className="mt-4 w-full text-[13px]" variant="secondary" type="submit" loading={verifying} disabled={!token.trim()}>
              Verify and open
            </Button>
          </form>
        </CardShell>
      </div>
      <p className="mx-auto mt-6 max-w-[74ch] text-center text-caption text-faint">
        Demo sign-in. Views shape what you see; the admin token guards destructive actions.
      </p>
      </div>
    </section>
  );
}
