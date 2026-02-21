import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./assistantMessage.css";

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
}

export default function AssistantMessage({
  content,
  isStreaming = false,
}: AssistantMessageProps) {
  if (!content && isStreaming) {
    return (
      <div className="assistant-message">
        <div className="assistant-message-content">
          <span className="typing-indicator">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="assistant-message">
      <div className="assistant-message-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
            h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
            h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
            h4: ({ children }) => <h4 className="md-h4">{children}</h4>,
            p: ({ children }) => <p className="md-p">{children}</p>,
            ul: ({ children }) => <ul className="md-ul">{children}</ul>,
            ol: ({ children }) => <ol className="md-ol">{children}</ol>,
            li: ({ children }) => <li className="md-li">{children}</li>,
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="md-code-inline" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className={`md-code-block ${className ?? ""}`} {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <pre className="md-pre">{children}</pre>,
            blockquote: ({ children }) => (
              <blockquote className="md-blockquote">{children}</blockquote>
            ),
            a: ({ href, children }) => (
              <a
                className="md-link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="md-table-wrapper">
                <table className="md-table">{children}</table>
              </div>
            ),
            th: ({ children }) => <th className="md-th">{children}</th>,
            td: ({ children }) => <td className="md-td">{children}</td>,
            strong: ({ children }) => (
              <strong className="md-strong">{children}</strong>
            ),
            em: ({ children }) => <em className="md-em">{children}</em>,
            hr: () => <hr className="md-hr" />,
          }}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && <span className="streaming-cursor">▊</span>}
      </div>
    </div>
  );
}
