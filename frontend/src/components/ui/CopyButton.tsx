import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { useToast } from './Toast';

export function CopyButton({
  text,
  label = 'Copy',
  size = 'sm',
  variant = 'secondary',
}: {
  text: string;
  label?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast('Could not copy to the clipboard', { tone: 'error', description: 'Select the text and copy it manually.' });
    }
  };

  return (
    <Button variant={variant} size={size} onClick={() => void copy()}>
      {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
