import * as React from 'react'
import anime from 'animejs'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import HomepageFeatures from '@site/src/components/HomepageFeatures'
import Heading from '@theme/Heading'

import styles from './index.module.css'

const AnimatedGradient = ({ children }: { children: React.ReactNode }) => {
  const domRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = domRef.current
    if (!el) return

    const gradMax = 100
    const gradMin = 0
    const gradWander = 30 // The higher the value, the less range to wander
    const gradSize = 80
    const gradMinSize = 61.8
    const gradMaxSize = gradSize * 1.5

    const helper1 = () => anime.random(gradMin, gradMax - gradWander)
    const helper2 = () => anime.random(gradMin + gradWander, gradMax)
    const helperSize = () => anime.random(gradMinSize, gradMaxSize)

    // Set default parameter values
    const element = Object.assign(el, {
      grad1Size: gradSize,
      grad1XPos: 20,
      grad1YPos: 20,
      grad2Size: gradSize,
      grad2XPos: 80,
      grad2YPos: 20,
      grad3Size: gradSize,
      grad3XPos: 20,
      grad3YPos: 80,
    })

    const animation = anime({
      targets: element,
      duration: 10000,
      loop: true,
      direction: 'alternate',
      easing: 'linear',
      // ---
      grad1Size: [{ value: helperSize }, { value: helperSize }, { value: helperSize }, { value: helperSize }],
      grad1XPos: [{ value: helper1 }, { value: helper1 }, { value: helper1 }, { value: helper1 }],
      grad1YPos: [{ value: helper1 }, { value: helper1 }, { value: helper1 }, { value: helper1 }],
      grad2Size: [{ value: helperSize }, { value: helperSize }, { value: helperSize }, { value: helperSize }],
      grad2XPos: [{ value: helper2 }, { value: helper2 }, { value: helper2 }, { value: helper2 }],
      grad2YPos: [{ value: helper1 }, { value: helper1 }, { value: helper1 }, { value: helper1 }],
      grad3Size: [{ value: helperSize }, { value: helperSize }, { value: helperSize }, { value: helperSize }],
      grad3XPos: [{ value: helper1 }, { value: helper1 }, { value: helper1 }, { value: helper1 }],
      grad3YPos: [{ value: helper2 }, { value: helper2 }, { value: helper2 }, { value: helper2 }],
      // ---
      update: () => {
        element.style.setProperty('--grad1Size', `${element.grad1Size}%`)
        element.style.setProperty('--grad1XPos', `${element.grad1XPos}%`)
        element.style.setProperty('--grad1YPos', `${element.grad1YPos}%`)
        element.style.setProperty('--grad2Size', `${element.grad2Size}%`)
        element.style.setProperty('--grad2XPos', `${element.grad2XPos}%`)
        element.style.setProperty('--grad2YPos', `${element.grad2YPos}%`)
        element.style.setProperty('--grad3Size', `${element.grad3Size}%`)
        element.style.setProperty('--grad3XPos', `${element.grad3XPos}%`)
        element.style.setProperty('--grad3YPos', `${element.grad3YPos}%`)
      },
    })

    return () => {
      animation.pause()
    }
  }, [])

  return (
    <header className={clsx('hero hero--primary', styles.banner)}>
      <div ref={domRef} className={clsx(styles.fullsize, styles.gradient)} />
      <div className={clsx(styles.fullsize, styles.noise)} />
      <div className={clsx(styles.fullsize, styles.darken)} />
      {children}
    </header>
  )
}

const AnimatedGrid = () => {
  const [width, setWidth] = React.useState(7)
  const height = 6
  const grid = Array.from({ length: height * width })
  const domRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!domRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const TITLE_WIDTH = 400
        const PADDING = 64
        const ITEM_WIDTH = 74
        const availableSpace = entry.contentRect.width - TITLE_WIDTH - PADDING * 2

        const maxItemsPerRow = Math.floor(availableSpace / ITEM_WIDTH)
        if (maxItemsPerRow < 3) setWidth(0)
        else if (maxItemsPerRow > 7) setWidth(7)
        else setWidth(maxItemsPerRow)
      }
    })

    resizeObserver.observe(domRef.current)
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const getOpacity = (idx: number) => {
    const rest = (idx % width) + 0.5
    const halfWidth = width / 2
    const distFromMiddle = Math.abs(rest - halfWidth)
    const normalized = distFromMiddle / halfWidth
    const strength = 0.9
    return 1 - normalized * strength
  }

  return (
    <div ref={domRef} className={styles.gridContainer}>
      <div className={styles.maskGrid} style={{ '--numCols': width, '--numRows': height } as React.CSSProperties}>
        <div className={styles.animatedGrid}>
          {grid.map((_, idx) => (
            <img key={idx} src="/img/rect.svg" alt={undefined} style={{ opacity: getOpacity(idx) }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()

  return (
    <AnimatedGradient>
      <div className={clsx('container', styles.container)}>
        <Heading as="h1" className={clsx('hero__title', styles.title)}>
          {siteConfig.title}
        </Heading>
        <p className={clsx('hero__subtitle', styles.tagline)}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/quickstart">
            Quickstart
          </Link>
        </div>
      </div>
      <AnimatedGrid />
    </AnimatedGradient>
  )
}

const HomePage = () => {
  return (
    <Layout title="Home" description="Virtualize your app with ease!">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  )
}

export default HomePage
