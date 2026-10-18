import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, Repeat, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/session/SessionProvider';
import { PERSONAS } from '@/session/personas';

export function PersonaChip() {
  const { session, signOut } = useSession();
  const navigate = useNavigate();
  if (!session) return null;
  const persona = PERSONAS[session.persona];
  const name = session.identity?.name;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex max-w-[240px] items-center gap-2 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink transition-colors duration-fast hover:border-line-strong hover:bg-surface-2"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-[10px]">
            {name ? name.charAt(0) : <UserRound size={11} strokeWidth={1.5} />}
          </span>
          <span className="truncate font-medium">{persona.label}</span>
          {name ? <span className="hidden truncate text-faint sm:inline">{name}</span> : null}
          <ChevronDown size={13} strokeWidth={1.5} className="shrink-0 text-faint" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="drop-overlay z-[60] min-w-[220px] rounded-md border border-line-strong bg-overlay p-1"
        >
          <div className="px-2.5 py-2">
            <p className="text-small font-medium text-ink">{persona.label}</p>
            <p className="text-[12px] text-muted">{name ?? persona.blurb}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={() => {
              signOut();
              navigate('/#choose');
            }}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-small text-ink outline-none data-[highlighted]:bg-surface-2"
          >
            <Repeat size={14} strokeWidth={1.5} />
            Switch view
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => {
              signOut();
              navigate('/');
            }}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-small text-ink outline-none data-[highlighted]:bg-surface-2"
          >
            <LogOut size={14} strokeWidth={1.5} />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
