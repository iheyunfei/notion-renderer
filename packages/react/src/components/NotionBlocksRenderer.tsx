import { blocks, ChildrenByBlockId } from '@notion-renderer/shared'
import React, { createContext, FC, Fragment, useContext } from 'react'
import { CustomableComponents } from '../types'
import { DefaultChildPageIcon } from './icon/DefaultChildPageIcon'
import * as plainBlocks from './plain-blocks'
import { CodeBlock } from './plain-blocks'
import { BulletedList } from './plain-blocks/BulletedList'
import { NumberedList } from './plain-blocks/NumberedList'

const createDefaultRendererContextValue = () => {
  const components: CustomableComponents = {
    CalloutBlock: plainBlocks.CalloutBlock,
    ColumnListBlock: plainBlocks.ColumnListBlock,
    HeadingBlock: plainBlocks.HeadingBlock,
    ParagraphBlock: plainBlocks.ParagraphBlock,
    QuoteBlock: plainBlocks.QuoteBlock,
    ToggleBlock: plainBlocks.ToggleBlock,
    ImageBlock: plainBlocks.ImageBlock,
  }
  return {
    components,
    childrenByBlockId: {} as ChildrenByBlockId,
    darkMode: false,
    BlocksRenderer,
  }
}

export const rendererContext = createContext(
  createDefaultRendererContextValue(),
)

export const NotionBlocksRenderer: FC<{
  blocks: blocks.Block[]
  components?: Partial<CustomableComponents>
  childrenByBlockId: ChildrenByBlockId
  darkMode?: boolean
}> = ({ blocks, components = {}, childrenByBlockId, darkMode = false }) => {
  const defaultRenderContextValue = createDefaultRendererContextValue()
  Object.assign(defaultRenderContextValue.components, components)
  defaultRenderContextValue.childrenByBlockId = childrenByBlockId
  defaultRenderContextValue.darkMode = darkMode
  return (
    <rendererContext.Provider value={defaultRenderContextValue}>
      <BlocksRenderer blocks={blocks} />
    </rendererContext.Provider>
  )
}

const BlocksRenderer: FC<{ blocks: blocks.Block[] }> = ({ blocks }) => {
  const { components, childrenByBlockId } = useContext(rendererContext)
  type Formated = (
    | Exclude<blocks.Block, { type: 'bulleted_list_item' } | { type: 'numbered_list_item' }>
    | blocks.BulletedListItemBlock[]
    | blocks.NumberedListItemBlock[]
  )[]
  const formated: Formated = blocks.reduce<Formated>((acc, cur) => {
    if (cur.type !== 'bulleted_list_item' && cur.type !== 'numbered_list_item') {
      return [...acc, cur]
    } else {
      const last = acc[acc.length - 1]
      if (last == null || 'type' in last || last[0]!.type !== cur.type) {
        if (cur.type === 'bulleted_list_item') {
          return [...acc, [cur]]
        } else {
          return [...acc, [cur]]
        }
      } else {
        ;(last as typeof cur[]).push(cur)
        return acc
      }
    }
  }, [])
  const rendererBlocks = formated.map((block, idx) => {
    let key = String(idx)
    const blockElm = (function() {
      // console.log('render', block)
      if ('type' in block) {
        key = block.id
        switch (block.type) {
          case 'image': {
            return <components.ImageBlock key={block.id} block={block} />
          }
          case 'column_list': {
            return <components.ColumnListBlock key={block.id} block={block} />
          }
          case 'paragraph': {
            return <components.ParagraphBlock key={block.id} block={block} />
          }
          case 'quote': {
            return <components.QuoteBlock key={block.id} block={block} />
          }
          case 'callout': {
            return (
              <div className="my-[4px]">
                <components.CalloutBlock key={block.id} block={block} />
              </div>
            )
          }
          case 'heading_1':
          case 'heading_2':
          case 'heading_3': {
            return <components.HeadingBlock key={block.id} block={block} />
          }
          case 'child_page': {
            return (
              <a href={`./${block.id}`}>
                <div className="py-[3px] px-[2px] items-center cursor-pointer hover:bg-slate-700/[.07] flex">
                  <div className="h-[24px] w-[24px] flex items-center justify-center mr-[4px] text-[20px]">
                    <DefaultChildPageIcon />
                  </div>
                  <div className="border-b border-b-[rgba(55, 53, 47, 0.16)] font-[500] text-[16px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {block.child_page.title}
                  </div>
                </div>
              </a>
            )
          }
          case 'divider': {
            return (
              <div className="h-[13px] flex items-center">
                <div className="h-[1px] w-full border-b botder-[rgba(55, 53, 47, 0.09)]" />
              </div>
            )
          }
          case 'toggle': {
            return <components.ToggleBlock key={block.id} block={block} />
          }
          case 'bookmark': {
            return (
              <a href={block.bookmark.url} target="_blank">
                <div className=" rounded-[3px] border p-[8px] hover:bg-slate-700/[.08] active:bg-slate-700/[.16]">
                  {block.bookmark.url}
                </div>
              </a>
            )
          }
          case 'synced_block': {
            const children = childrenByBlockId[block.id]
            return <BlocksRenderer blocks={children ?? []} />
          }
          case 'code': {
            return <CodeBlock block={block} />
          }
          default: {
            return null
          }
        }
      } else {
        if (block[0]!.type == 'bulleted_list_item') {
          block = block as blocks.BulletedListItemBlock[]
          return <BulletedList items={block} />
        } else {
          block = block as blocks.NumberedListItemBlock[]
          return <NumberedList items={block} />
        }
      }
    })()
    return <Fragment key={idx}>{blockElm}</Fragment>
  })
  return <>{rendererBlocks}</>
}
