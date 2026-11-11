/**
 * The installed content: capabilities, methods and campaigns, with their sources and limits.
 *
 * Every citation shows whether the page behind it was actually retrieved. That is the honest
 * state of this build: no publisher host was reachable from the environment the content was
 * written in, so the attributions are unchecked and the interface says so rather than only a
 * document saying so.
 */
import { useApp } from '../state'
import { CHALLENGE_LABEL } from './labels'

export function ContentPage() {
  const { content } = useApp()
  const unverified = content
    .methods()
    .flatMap((method) => method.sources)
    .filter((source) => !source.retrieved).length

  return (
    <div className="stack">
      <header>
        <p className="kicker">Methods and content</p>
        <h1>What is installed</h1>
        <div className="lede">
          <p>
            A method is a lens. It changes what support you have when you look at a situation; it does not change what
            your records show.
          </p>
        </div>
      </header>

      {unverified > 0 ? (
        <section className="panel panel--caution">
          <h2>{unverified} of the citations below are unverified</h2>
          <p>
            The pages were not retrieved while this content was written, because no publisher host was reachable from
            the build environment. The titles, authors and attributed claims are recorded as written down, not as
            checked. Each one says so next to the link.
          </p>
        </section>
      ) : null}

      {content.packs.map((pack) => (
        <section className="panel" key={pack.id}>
          <h2>
            {pack.title} <span className="tag">version {pack.version}</span>
          </h2>
          <p>{pack.summary}</p>
          <p className="meta">{pack.note}</p>

          <h3>Campaigns</h3>
          <ul className="record-list">
            {pack.campaigns.map((campaign) => (
              <li key={campaign.id}>
                <strong>{campaign.title}</strong> <span className="tag">{CHALLENGE_LABEL[campaign.challenge]}</span>
                <p>{campaign.purpose}</p>
                <p className="meta">What it does not do: {campaign.limits}</p>
                <p className="meta">
                  {campaign.steps.length} steps. A fictional starting example: {campaign.situationPrompt}
                </p>
              </li>
            ))}
          </ul>

          <h3>Methods</h3>
          <ul className="record-list">
            {pack.methods.map((method) => (
              <li key={method.id}>
                <strong>{method.title}</strong>
                <p>{method.explanation}</p>
                <h4>When it may help</h4>
                <ul>
                  {method.whenToUse.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h4>When it may not fit</h4>
                <ul>
                  {method.whenItMayNotFit.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h4>Limits</h4>
                <p>{method.limits}</p>
                <h4>Questions it asks</h4>
                <ul>
                  {method.prompts.map((prompt) => (
                    <li key={prompt}>{prompt}</li>
                  ))}
                </ul>
                <h4>A fictional example: {method.example.title}</h4>
                <p>{method.example.narrative}</p>
                <h4>Sources</h4>
                <ul>
                  {method.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} rel="noreferrer noopener" target="_blank">
                        {source.title}
                      </a>{' '}
                      — {source.author} ({source.sourceType})
                      <br />
                      <span className="meta">Supports: {source.supportedClaim}</span>
                      <br />
                      <span className="meta">
                        <strong>{source.retrieved ? 'Retrieved' : 'Not retrieved'}</strong> · cited {source.citedOn} ·{' '}
                        {source.verificationNote}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <h3>Capabilities</h3>
          <ul className="record-list">
            {pack.capabilities.map((capability) => (
              <li key={capability.id}>
                <strong>{capability.title}</strong>
                <p>{capability.observable}</p>
                <p className="meta">A small thing you could try: {capability.nextExperiment}</p>
                <p className="meta">What this definition does not cover: {capability.limits}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
