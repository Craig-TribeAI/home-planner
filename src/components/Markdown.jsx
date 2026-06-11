import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Safe markdown rendering (no dangerouslySetInnerHTML). Links open in a new tab.
export default function Markdown({ children, className }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
