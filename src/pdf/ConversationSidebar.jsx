import { useEffect, useRef } from "react";
import AudioPlayer from "../components/AudioPlayer.jsx";
import { t } from "./strings.js";
import "./ConversationSidebar.css";

/**
 * Chat-style list of TTS generations for the AudioBook screen.
 */
export default function ConversationSidebar({
  language,
  items,
  onDelete,
  onRetry,
  onClearAll,
}) {
  const listRef = useRef(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (items.length > lastCountRef.current && listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    lastCountRef.current = items.length;
  }, [items.length]);

  const isEmpty = items.length === 0;

  return (
    <aside className="convo" aria-label={t(language, "convo.title")}>
      <header className="convo__header">
        <h2 className="convo__title">{t(language, "convo.title")}</h2>
        {!isEmpty && (
          <button
            type="button"
            className="convo__clear"
            onClick={onClearAll}
            title={t(language, "convo.clearAll")}
          >
            {t(language, "convo.clearAll")}
          </button>
        )}
      </header>

      <div className="convo__list" ref={listRef}>
        {isEmpty ? (
          <div className="convo__empty">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="convo__empty-icon">
              <rect x="6" y="10" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 17h16M12 21h12M12 25h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="convo__empty-title">{t(language, "convo.empty.title")}</p>
            <p className="convo__empty-hint">{t(language, "convo.empty.hint")}</p>
          </div>
        ) : (
          items.map((item) => (
            <ConvoItem
              key={item.id}
              item={item}
              onDelete={() => onDelete(item.id)}
              onRetry={() => onRetry(item.id)}
              language={language}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ConvoItem({ item, onDelete, onRetry, language }) {
  return (
    <div className="convo__item">
      <div className="convo__bubble convo__bubble--user">
        <div className="convo__bubble-head">
          <span className="convo__role">{t(language, "convo.you")}</span>
          <button
            type="button"
            className="convo__icon-btn"
            onClick={onDelete}
            title={t(language, "convo.delete")}
            aria-label={t(language, "convo.delete")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="convo__text">{item.text}</p>
        <div className="convo__meta">
          <span className="convo__model">{item.modelLabel}</span>
        </div>
      </div>

      <div className="convo__bubble convo__bubble--assistant">
        <div className="convo__bubble-head">
          <span className="convo__role">{t(language, "convo.assistant")}</span>
        </div>

        {item.status === "pending" && (
          <div className="convo__pending">
            <span className="convo__spinner" aria-hidden="true" />
            <span>{t(language, "convo.generating")}</span>
          </div>
        )}

        {item.status === "error" && (
          <div className="convo__error">
            <span>{item.error || t(language, "convo.failed")}</span>
            <button type="button" className="convo__retry" onClick={onRetry}>
              {t(language, "convo.retry")}
            </button>
          </div>
        )}

        {item.status === "done" && item.audioUrl && (
          <AudioPlayer audioUrl={item.audioUrl} />
        )}
      </div>
    </div>
  );
}