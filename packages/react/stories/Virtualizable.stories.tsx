import React from 'react'
import { Meta, Story } from '@storybook/react'
import { Virtualizable } from '../src'

const meta: Meta = {
  title: 'Virtualizable',
  component: Virtualizable,
  argTypes: {
    children: {
      control: {
        type: 'text',
      },
    },
  },
  parameters: {
    controls: { expanded: true },
  },
}

export default meta

const Template: Story = () => (
  <Virtualizable items={[]} getBoundingBox={() => ({ x: 0, y: 0, height: 0, width: 0 })} renderItem={() => <div />} />
)

// By passing using the Args format for exported stories, you can control the props for a component for reuse in a test
// https://storybook.js.org/docs/react/workflows/unit-testing
export const Default = Template.bind({})

Default.args = {}
