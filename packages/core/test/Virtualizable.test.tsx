import React from 'react'
import * as ReactDOM from 'react-dom/client'
import { Default as Virtualizable } from '../stories/Virtualizable.stories'

describe('Virtualizable', () => {
  it('renders without crashing', () => {
    const root = ReactDOM.createRoot(document.createElement('div'))
    root.render(<Virtualizable />)
    root.unmount()
  })
})
