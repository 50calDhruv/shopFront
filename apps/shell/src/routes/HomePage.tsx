import { Link } from 'react-router-dom';
import { Card, CardBody, CardTitle } from '@shop/ui';

const PILLARS = [
  {
    title: 'Independent deployability',
    body: 'Four apps build and ship on their own schedule. The shell can be redeployed without rebuilding a single remote.',
  },
  {
    title: 'Shared singletons',
    body: 'React, React DOM, React Router and the UI package are loaded exactly once, negotiated at runtime by Module Federation.',
  },
  {
    title: 'Failure isolation',
    body: 'Every remote is lazy-loaded behind its own error boundary. One remote going down cannot take the storefront with it.',
  },
  {
    title: 'Cross-remote events',
    body: 'Remotes never import each other. They publish typed events to a bus the shell owns, and the shell decides what happens.',
  },
] as const;

export function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <p className="text-sm font-medium text-brand-700">Micro-frontend reference build</p>
        <h1 className="max-w-2xl text-4xl font-semibold text-ink-900">
          A storefront assembled from four independently deployed apps.
        </h1>
        <p className="max-w-2xl text-base text-ink-600">
          The shell owns layout, routing and session. Catalog, cart and account are
          separate builds, loaded at runtime over Module Federation.
        </p>
        <div className="flex gap-3 pt-1">
          <Link
            to="/catalog"
            className={
              'inline-flex h-10 items-center rounded-md bg-brand-600 px-4 text-sm ' +
              'font-medium text-white shadow-subtle transition-[transform,background-color] ' +
              'duration-200 [transition-timing-function:var(--ease-spring)] ' +
              'hover:bg-brand-700 active:scale-[0.97] motion-reduce:active:scale-100'
            }
          >
            Browse the catalog
          </Link>
        </div>
      </section>

      <section aria-labelledby="pillars" className="flex flex-col gap-4">
        <h2 id="pillars" className="text-xl font-semibold text-ink-900">
          What this build demonstrates
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <li key={pillar.title}>
              <Card className="h-full">
                <CardBody className="flex flex-col gap-2 p-5">
                  <CardTitle className="text-base">{pillar.title}</CardTitle>
                  <p className="text-sm text-ink-600">{pillar.body}</p>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
