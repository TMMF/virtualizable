import clsx from 'clsx'
import Heading from '@theme/Heading'
import styles from './styles.module.css'

type FeatureItem = {
  title: string
  Svg: React.ComponentType<React.ComponentProps<'svg'>>
  description: JSX.Element
}

const FeatureList: FeatureItem[] = [
  {
    title: 'Lightning Fast',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Svg: require('@site/static/img/zap.svg').default,
    description: (
      <>
        Virtualizable is designed from first principles to be as fast as possible. It uses a combination of heuristics
        and optimizations to ensure that your app remains performant, even with millions of items.
      </>
    ),
  },
  {
    title: 'Easy to Use',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Svg: require('@site/static/img/feather.svg').default,
    description: (
      <>
        Virtualizable lets you focus on your application instead of worrying about virtualization and performance.
        It&apos;s designed to be simple to integrate into your existing codebase.
      </>
    ),
  },
  {
    title: 'Extensible',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Svg: require('@site/static/img/grid.svg').default,
    description: (
      <>
        Virtualizable is designed to be flexible and customizable, so you can adapt it to your application with ease. If
        the default behavior doesn&apos;t suit your needs, break out the individual pieces and build your own solution.
      </>
    ),
  },
]

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}
