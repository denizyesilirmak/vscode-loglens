import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { LogEntry } from '../../store/logcatStore';
import { ArrowDownCircleIcon } from '@heroicons/react/24/solid';
import './style.css';

interface LogCatProps {
  logs: LogEntry[];
  keyword?: string;
}

const LogCat = ({ logs = [], keyword }: LogCatProps) => {
  const parentalRef = useRef<HTMLDivElement>(null);
  // We use a ref for isSticky to avoid re-creating the scroll handler constantly
  const isStickyRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Virtualizer instance
  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentalRef.current,
    estimateSize: () => 24,
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (!parentalRef.current) return;
    try {
      rowVirtualizer.scrollToIndex(logs.length - 1, { align: 'end' });
      isStickyRef.current = true;
      setShowScrollButton(false);
    } catch (e) {
      console.error("Scroll error", e);
    }
  }, [logs.length, rowVirtualizer]);

  // Effect: triggered when logs change.
  // If we are sticky, we MUST scroll to bottom immediately.
  useLayoutEffect(() => {
    if (isStickyRef.current) {
      scrollToBottom();
    }
  }, [logs.length, scrollToBottom]);

  // Handle user scroll interactions
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;

    // Calculate distance from bottom
    // scrollHeight - scrollTop - clientHeight = distance to bottom
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    // If user is very close to bottom (< 20px), make it sticky again automatically
    // This helps if they scrolled down manually
    if (distanceToBottom < 20) {
      isStickyRef.current = true;
      setShowScrollButton(false);
    } else {
      // If user scrolled up significantly, disable stickiness
      if (isStickyRef.current && distanceToBottom > 50) {
        isStickyRef.current = false;
        setShowScrollButton(true);
      }
    }
  }, []);

  // Force scroll to bottom on mount if there are logs
  useEffect(() => {
    if (logs.length > 0) {
      scrollToBottom();
    }
  }, []);

  return (
    <div className="logcat-container">
      <div
        ref={parentalRef}
        onScroll={onScroll}
        style={{
          height: '100%',
          overflowY: 'auto',
          contain: 'strict',
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const log = logs[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className={`log-row level-${log.Level || 'V'}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="col-time">
                  {log.Time ? format(new Date(log.Time), 'HH:mm:ss.SSS') : ''}
                </div>
                <div className={`col-level tag-${log.Level || 'V'}`}>
                  {log.Level || 'V'}
                </div>
                <div className="col-tag" title={log.Tag}>
                  {log.Tag}
                </div>
                <div className="col-pid" title={`PID: ${log.PID} / TID: ${log.TID}`}>
                  {log.PID}
                </div>
                <div className="col-msg">
                  {keyword ? (
                    <Highlight text={log.Message} keyword={keyword} />
                  ) : (
                    log.Message
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showScrollButton && (
        <button
          className="scroll-bottom-btn"
          onClick={(e) => {
            e.stopPropagation(); // Prevent bubbling
            scrollToBottom();
          }}
          title="Resume Auto-Scroll"
        >
          <ArrowDownCircleIcon style={{ width: 24, height: 24 }} />
        </button>
      )}
    </div>
  );
};

const Highlight = ({ text, keyword }: { text: string; keyword: string }) => {
  if (!keyword) return <>{text}</>;
  const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <span key={i} style={{ backgroundColor: 'var(--vscode-editor-findMatchHighlightBackground)', color: 'inherit' }}>{part}</span>
        ) : (
          part
        )
      )}
    </span>
  );
};

export default LogCat;
