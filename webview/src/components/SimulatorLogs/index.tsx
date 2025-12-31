import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { IosLogEntry } from '../../store/iosLogStore';
import { ArrowDownCircleIcon } from '@heroicons/react/24/solid';
import './style.css';

interface SimulatorLogsProps {
  logs: IosLogEntry[];
  keyword?: string;
}

const SimulatorLogs: React.FC<SimulatorLogsProps> = ({ logs, keyword = '' }) => {
  const parentalRef = useRef<HTMLDivElement>(null);
  const isStickyRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Filter logs if keyword exists
  const filteredLogs = keyword
    ? logs.filter(
      (log) =>
        log.Message.toLowerCase().includes(keyword.toLowerCase()) ||
        log.Process.toLowerCase().includes(keyword.toLowerCase()),
    )
    : logs;

  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentalRef.current,
    estimateSize: () => 24,
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const scrollToBottom = useCallback(() => {
    if (!parentalRef.current) return;
    try {
      rowVirtualizer.scrollToIndex(filteredLogs.length - 1, { align: 'end' });
      isStickyRef.current = true;
      setShowScrollButton(false);
    } catch (e) {
      console.error("Scroll error", e);
    }
  }, [filteredLogs.length, rowVirtualizer]);

  useLayoutEffect(() => {
    if (isStickyRef.current) {
      scrollToBottom();
    }
  }, [filteredLogs.length, scrollToBottom]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    if (distanceToBottom < 20) {
      isStickyRef.current = true;
      setShowScrollButton(false);
    } else {
      if (isStickyRef.current && distanceToBottom > 50) {
        isStickyRef.current = false;
        setShowScrollButton(true);
      }
    }
  }, []);

  useEffect(() => {
    if (filteredLogs.length > 0) {
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
            const log = filteredLogs[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="log-row"
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
                <div className="col-process" title={log.Process}>
                  {log.Process}
                </div>
                <div className="col-msg">
                  <Highlight text={log.Message} keyword={keyword} />
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
            e.stopPropagation();
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

export default SimulatorLogs;
