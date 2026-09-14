import { Card, CardBody } from '@shop/ui';

interface RemotePlaceholderProps {
  name: string;
  phase: string;
  willOwn: string[];
}

/**
 * PHASE 1 ONLY — replaced by the real federated mounts in Phases 2–4.
 *
 * It exists so the shell's routing table, layout and providers can be reviewed
 * on their own, before Module Federation is introduced. Keeping these two
 * concerns in separate phases means that when federation breaks (and it will),
 * you already know the routing underneath it is sound.
 */
export function RemotePlaceholder({ name, phase, willOwn }: RemotePlaceholderProps) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3 p-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-caution-50 px-2.5 text-xs font-semibold text-caution-600">
            Not wired yet
          </span>
          <span className="text-xs text-ink-500">arrives in {phase}</span>
        </div>

        <h1 className="text-xl font-semibold text-ink-900">
          <code className="font-mono text-brand-700">{name}</code> remote mounts here
        </h1>

        <p className="max-w-prose text-sm text-ink-600">
          The shell has routed <code className="font-mono">/{name}/*</code> to this slot
          and stops there. Everything below this line will be owned by the remote,
          including its own nested routes.
        </p>

        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-600">
          {willOwn.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
