'use client';
import { Tweet, Account, timeAgo, fmtNum, initials } from '@/lib/api';
import { useLang } from '@/lib/i18n';
import TweetReactions from './TweetReactions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function fullUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

export default function TweetCard({ tweet, account }: { tweet: Tweet; account: Account }) {
  const { t } = useLang();
  const hasRich = tweet.richText && tweet.richText.trim().length > 0;
  const hasMedia = tweet.media && tweet.media.length > 0;

  return (
    <article className="tweet-card">
      <header className="tweet-header">
        <div className="tweet-av">
          {account.avatar ? <img src={account.avatar} alt={account.displayName} loading="lazy" decoding="async"/> : initials(account.displayName)}
        </div>
        <div>
          <div className="tweet-name">{account.displayName}</div>
          <div className="tweet-handle">@{account.handle}</div>
        </div>
        <span className="tweet-time">{timeAgo(tweet.createdAt)}</span>
      </header>

      {hasRich ? (
        <div className="tweet-text rich" dangerouslySetInnerHTML={{ __html: tweet.richText! }} />
      ) : (
        <div className="tweet-text">{tweet.text}</div>
      )}

      {hasMedia && (
        <div className={`tweet-media-grid count-${Math.min(tweet.media.length, 4)}`}>
          {tweet.media.slice(0, 4).map((m, i) => (
            <div key={i} className="tweet-media-item">
              {m.type === 'video' ? (
                <video src={fullUrl(m.url)} controls preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src={fullUrl(m.url)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
          ))}
        </div>
      )}

      <TweetReactions tweetId={tweet.id} />

      <footer className="tweet-stats">
        {tweet.likes > 0 && <span className="tweet-stat"><span className="icon">♥</span> {fmtNum(tweet.likes)}</span>}
        {tweet.retweets > 0 && <span className="tweet-stat"><span className="icon">↻</span> {fmtNum(tweet.retweets)}</span>}
        {tweet.replies > 0 && <span className="tweet-stat"><span className="icon">💬</span> {fmtNum(tweet.replies)}</span>}
        {tweet.xUrl && (
          <a href={tweet.xUrl} target="_blank" rel="noopener noreferrer" className="tweet-x-link">
            {t.open_on_x} →
          </a>
        )}
      </footer>
    </article>
  );
}
