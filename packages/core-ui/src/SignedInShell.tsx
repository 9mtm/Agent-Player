import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { SessionClient } from './session';
import { ChatController } from './chat';
import { ChatScreen } from './ChatScreen';
import { AgentsDestination } from './AgentsDestination';
import { BoardController } from './board';
import { TaskBoard } from './TaskBoard';
import { AccountPanel, MemoryPanel } from './SessionPanels';
import { Icon } from './icons';
import type { IconName } from './icons';
import { UiIcon } from './ui-icons';

type Page = 'chat' | 'agents' | 'board' | 'memory' | 'account';
const pages: ReadonlyArray<{ key: Page; label: string; icon: IconName | 'board' }> = [
  { key: 'chat', label: 'Chat', icon: 'message-circle' },
  { key: 'agents', label: 'Agents', icon: 'user' },
  { key: 'board', label: 'Board', icon: 'board' },
  { key: 'memory', label: 'Memory', icon: 'database' },
  { key: 'account', label: 'Account', icon: 'settings' },
];

/**
 * The signed-in workspace: a left sidebar (new chat, pages, the current
 * conversation, the account), the page area and a status bar. Every page
 * stays mounted and only the active one is shown, so a conversation or an
 * unsaved agent draft survives switching pages.
 */
export function SignedInShell({ client, notice }: { client: SessionClient; notice: ReactNode }) {
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  const [page, setPage] = useState<Page>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [chat, setChat] = useState<ChatController>();
  const [chatKey, setChatKey] = useState(0);
  useEffect(() => { const c = new ChatController(client); setChat(c); return () => c.dispose(); }, [client, chatKey]);
  const [board, setBoard] = useState<BoardController>();
  useEffect(() => { const b = new BoardController(client); setBoard(b); return () => b.dispose(); }, [client]);
  const chatState = useSyncExternalStore(
    chat ? chat.subscribe : noopSubscribe,
    chat ? chat.getSnapshot : nullSnapshot,
    chat ? chat.getSnapshot : nullSnapshot);
  const title = chatState?.turns[0]?.prompt.trim().slice(0, 60);
  const user = state.user!;
  const mode = state.mode === 'mock' ? 'mock' : 'live';

  return <div className="shell app-shell" data-theme={theme} lang="en" dir="ltr">
    <aside className="sidebar">
      <div className="sidebar-brand"><span className="workspace-mark" aria-hidden="true"/>Dpro</div>
      <button className="nav-item new-chat" onClick={() => { setChatKey(k => k + 1); setPage('chat'); }} disabled={chatState?.phase === 'sending'}>
        <UiIcon name="compose" size={15}/>New chat
      </button>
      <nav aria-label="Workspace">{pages.map(p =>
        <button key={p.key} className="nav-item" aria-current={page === p.key ? 'page' : undefined} onClick={() => setPage(p.key)}>
          {p.icon === 'board' ? <UiIcon name="board" size={14}/> : <Icon name={p.icon}/>}{p.label}
        </button>)}
      </nav>
      <p className="section-label"><span className="checker" aria-hidden="true"/>Conversations</p>
      <div className="session-list">
        {title
          ? <button className="session-row" aria-current={page === 'chat' ? 'true' : undefined} onClick={() => setPage('chat')}><span className="dot" aria-hidden="true"/><span className="session-title">{title}</span></button>
          : <p className="session-empty">No conversation yet. History of earlier conversations is not loaded.</p>}
      </div>
      <div className="sidebar-footer">
        <button className="user-chip" onClick={() => setPage('account')} title="Account">
          <span className="avatar" aria-hidden="true">{(user.username || '?').slice(0, 1).toUpperCase()}</span>
          <span className="user-name"><bdi>{user.username}</bdi><small>{user.role}</small></span>
        </button>
        <button className="icon-button" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label="Switch theme"><UiIcon name={theme === 'dark' ? 'sun' : 'moon'} size={15}/></button>
      </div>
    </aside>
    <main id="content" className="page-area">
      {notice && <p className="page-notice" role="status">{notice}</p>}
      <section className="page page-chat" aria-label="Chat" hidden={page !== 'chat'}>
        {chat ? <ChatScreen key={chatKey} controller={chat} mode={mode}/> : <p>Chat is not connected.</p>}
      </section>
      <section className="page page-scroll" hidden={page !== 'agents'}><div className="page-column"><AgentsDestination client={client} active={page === 'agents'}/></div></section>
      <section className="page page-scroll page-board" hidden={page !== 'board'}>{board && <TaskBoard controller={board} active={page === 'board'}/>}</section>
      <section className="page page-scroll page-wide" hidden={page !== 'memory'}><MemoryPanel client={client} active={page === 'memory'}/></section>
      <section className="page page-scroll" hidden={page !== 'account'}><div className="page-column"><AccountPanel client={client}/></div></section>
    </main>
    <footer className="statusbar">
      <span><span className={`status-dot ${mode}`} aria-hidden="true"/>{mode === 'mock' ? 'Offline practice — fictional data' : 'Connected · this installation'}</span>
      <span className="statusbar-actions">
        <span>Copy: English draft</span>
        <button className="statusbar-button" onClick={() => client.selectMode('fixture')} title="Clears this local session; the server sign-in stays until you sign out">Leave to fixture</button>
      </span>
    </footer>
  </div>;
}

const noopSubscribe = () => () => {};
const nullSnapshot = () => undefined;
