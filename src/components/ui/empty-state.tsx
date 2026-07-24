import { Button } from './button';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Sin ilustraciones. Tres elementos: qué falta, por qué importa, qué hacer. */
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-card text-ink font-medium">{title}</p>
      <p className="text-caption text-sage max-w-sm">{description}</p>
      {actionLabel && (
        <Button className="mt-1" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
