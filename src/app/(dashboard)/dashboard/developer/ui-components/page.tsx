'use client';

import React, { useState, useCallback, useRef } from 'react';
import { SpecRenderer } from '@/lib/json-render/renderer';
import { createMixedStreamParser, applySpecPatch } from '@/lib/ui-web4/core';
import type { Spec, SpecStreamLine } from '@/lib/ui-web4/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Loader2, FileText, FlaskConical, Search, X, LayoutGrid, Sun, Moon, Monitor, Sparkles, Palette, Settings2, Check, Tablet, Smartphone, Watch } from 'lucide-react';

// ─── Apple Watch Frame Component ──────────────────────────────────────────────

function WatchFrame({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {/* Metal bezel */}
            <div style={{
                position: 'relative',
                width: 176,
                height: 214,
                borderRadius: 44,
                background: 'linear-gradient(160deg, #2e2e2e 0%, #111 60%, #1a1a1a 100%)',
                boxShadow: '0 0 0 1.5px #3c3c3c, 0 0 0 3px #1a1a1a, 0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.09)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* Digital Crown */}
                <div style={{
                    position: 'absolute', right: -7, top: 54,
                    width: 7, height: 34,
                    borderRadius: '0 4px 4px 0',
                    background: 'linear-gradient(90deg, #1c1c1c, #3a3a3a)',
                    boxShadow: '3px 0 6px rgba(0,0,0,0.6)',
                }} />
                {/* Side button */}
                <div style={{
                    position: 'absolute', right: -7, bottom: 60,
                    width: 7, height: 22,
                    borderRadius: '0 3px 3px 0',
                    background: 'linear-gradient(90deg, #1c1c1c, #3a3a3a)',
                    boxShadow: '3px 0 6px rgba(0,0,0,0.6)',
                }} />
                {/* Screen */}
                <div style={{
                    width: 160,
                    height: 198,
                    borderRadius: 38,
                    overflow: 'hidden',
                    background: '#000',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                }}>
                    {/* Status bar */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 14px 0', color: '#fff', fontSize: 10,
                    }}>
                        <span style={{ fontWeight: 500 }}>9:41</span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <div style={{ width: 14, height: 8, borderRadius: 2, border: '1px solid rgba(255,255,255,0.4)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', left: 1, top: 1, bottom: 1, width: '80%', background: '#30d158', borderRadius: 1 }} />
                            </div>
                        </div>
                    </div>
                    {/* Content area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 10px 8px', gap: 0, overflow: 'hidden' }}>
                        {children}
                    </div>
                </div>
            </div>
            {/* Label */}
            <span style={{ fontSize: 11, color: 'var(--muted-foreground, #888)', textAlign: 'center', fontWeight: 500 }}>{label}</span>
        </div>
    );
}

// Watch button helper (green = primary, red = destructive, gray = secondary)
function WBtn({ color, children, wide }: { color: 'green' | 'red' | 'gray'; children: React.ReactNode; wide?: boolean }) {
    const bg = color === 'green' ? '#30d158' : color === 'red' ? '#ff453a' : '#3a3a3c';
    const text = color === 'gray' ? '#ebebf5' : '#fff';
    return (
        <div style={{
            background: bg, color: text,
            borderRadius: 18, textAlign: 'center',
            fontSize: 12, fontWeight: 600,
            padding: '7px 0',
            flex: wide ? undefined : 1,
            width: wide ? '100%' : undefined,
        }}>{children}</div>
    );
}

function WatchShowcase() {
    return (
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
            {/* Section: Notifications */}
            <div style={{ width: '100%', maxWidth: 900 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground, #fff)', marginBottom: 4 }}>Notifications</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground, #888)' }}>How alerts arrive on the user's wrist</div>
                </div>
                <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>

                    {/* 1 — Avatar message */}
                    <WatchFrame label="Message">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 13, background: 'linear-gradient(135deg, #5e5ce6, #bf5af2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1 }}>Alex</div>
                                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.2 }}>Agent Player</div>
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.4, flex: 1 }}>
                            Hey! Are you free for the call at 3PM?
                        </div>
                        <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }}>
                            <WBtn color="gray">Dismiss</WBtn>
                            <WBtn color="green">Reply</WBtn>
                        </div>
                    </WatchFrame>

                    {/* 2 — Payment */}
                    <WatchFrame label="Payment">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: '#635bff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Stripe</span>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: -1 }}>$49.99</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>from John D.</div>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <WBtn color="red">Decline</WBtn>
                            <WBtn color="green">Pay</WBtn>
                        </div>
                    </WatchFrame>

                    {/* 3 — OTP */}
                    <WatchFrame label="OTP Code">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 11, background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Verification</span>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Your code</div>
                            <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: 4, fontVariantNumeric: 'tabular-nums' }}>483291</div>
                            <div style={{ fontSize: 9, color: '#ff9f0a' }}>Expires in 2:34</div>
                        </div>
                        <WBtn color="gray" wide>Copy Code</WBtn>
                    </WatchFrame>

                </div>
            </div>

            {/* Section: Action Confirmations */}
            <div style={{ width: '100%', maxWidth: 900 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground, #fff)', marginBottom: 4 }}>Action Confirmations</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground, #888)' }}>User decisions, approvals, and system actions</div>
                </div>
                <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>

                    {/* 4 — Task approval */}
                    <WatchFrame label="Task Approval">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: '#ff9f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Agent Task</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, marginBottom: 2 }}>Deploy to production</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', flex: 1 }}>Requested by Agent #2</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <WBtn color="red">Reject</WBtn>
                            <WBtn color="green">Approve</WBtn>
                        </div>
                    </WatchFrame>

                    {/* 5 — Confirm destructive action */}
                    <WatchFrame label="Confirm Action">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 11, background: '#ff453a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Warning</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, flex: 1, lineHeight: 1.4 }}>Delete all session records?</div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <WBtn color="gray">Cancel</WBtn>
                            <WBtn color="red">Delete</WBtn>
                        </div>
                    </WatchFrame>

                    {/* 6 — Face ID auth */}
                    <WatchFrame label="Authentication">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/><circle cx="12" cy="12" r="3"/></svg>
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Agent Player</span>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                            {/* Face ID ring animation */}
                            <div style={{ width: 52, height: 52, borderRadius: 26, border: '2px solid #30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 18, border: '1.5px solid rgba(48,209,88,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(48,209,88,0.2)', border: '1.5px solid rgba(48,209,88,0.6)' }} />
                                </div>
                            </div>
                            <div style={{ fontSize: 10, color: '#30d158', fontWeight: 600 }}>Confirmed</div>
                        </div>
                        <WBtn color="green" wide>Continue</WBtn>
                    </WatchFrame>

                </div>
            </div>
        </div>
    );
}

// ─── Mock Spec — shows every component ────────────────────────────────────────

const MOCK_SPEC: Spec = {
    root: 'root-stack',
    elements: {
        'root-stack': { type: 'Stack', props: { gap: 'lg', direction: 'vertical' }, children: ['heading-title', 'heading-weather', 'grid-weather', 'sep-24', 'heading-avatar', 'grid-avatar', 'sep-21', 'heading-scb', 'grid-scb', 'sep-22', 'heading-asp', 'grid-asp', 'sep-23', 'grid-metrics', 'sep-1', 'heading-tasks', 'table-tasks', 'sep-2', 'heading-timeline', 'timeline-day', 'sep-3', 'tabs-reports', 'sep-4', 'heading-charts', 'grid-charts', 'sep-5', 'heading-more', 'grid-callouts', 'accordion-faq', 'grid-badges', 'stack-links', 'sep-6', 'heading-new', 'grid-progress', 'sep-7', 'heading-alerts-users', 'grid-alerts', 'grid-users', 'sep-8', 'heading-switches', 'stack-switches', 'sep-9', 'card-area', 'sep-10', 'heading-forms', 'grid-forms', 'sep-11', 'heading-selection', 'grid-selection', 'sep-12', 'heading-misc', 'grid-misc', 'sep-13', 'heading-toggles', 'grid-toggles', 'sep-14', 'heading-nav', 'grid-nav', 'sep-15', 'heading-hover', 'grid-hover', 'sep-16', 'heading-panels', 'grid-panels', 'sep-17', 'heading-dialogs', 'grid-dialogs', 'sep-18', 'heading-command', 'grid-command', 'sep-19', 'heading-layout', 'grid-layout', 'sep-20', 'heading-fileformats', 'grid-fileformats'] },

        // ── Headings ─────────────────────────────────────────────────────────
        'heading-title':   { type: 'Heading', props: { text: 'UI Components — Developer Preview', level: 'h1' }, children: [] },
        'heading-weather': { type: 'Heading', props: { text: 'WeatherCard — 3 Sizes', level: 'h2' }, children: [] },
        'heading-tasks':   { type: 'Heading', props: { text: 'Task Summary', level: 'h2' }, children: [] },
        'heading-timeline':{ type: 'Heading', props: { text: 'Today\'s Timeline', level: 'h2' }, children: [] },
        'heading-charts':  { type: 'Heading', props: { text: 'Charts', level: 'h2' }, children: [] },
        'heading-more':    { type: 'Heading', props: { text: 'Other Components', level: 'h2' }, children: [] },

        // ── WeatherCard ───────────────────────────────────────────────────────
        'sep-24': { type: 'Separator', props: {}, children: [] },
        'grid-weather': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['weather-sm', 'weather-md', 'weather-lg'] },

        'weather-sm': {
            type: 'WeatherCard',
            props: {
                location: 'Dubai',
                condition: 'sunny',
                temperature: 38,
                unit: 'C',
                humidity: null,
                wind: null,
                feelsLike: null,
                size: 'sm',
                forecast: null,
            },
            children: [],
        },

        'weather-md': {
            type: 'WeatherCard',
            props: {
                location: 'London',
                condition: 'rainy',
                temperature: 12,
                unit: 'C',
                humidity: 82,
                wind: 24,
                feelsLike: 9,
                size: 'md',
                forecast: null,
            },
            children: [],
        },

        'weather-lg': {
            type: 'WeatherCard',
            props: {
                location: 'Tokyo',
                condition: 'partly-cloudy',
                temperature: 19,
                unit: 'C',
                humidity: 65,
                wind: 14,
                feelsLike: 17,
                size: 'lg',
                forecast: [
                    { day: 'Mon', condition: 'sunny',        high: 22, low: 14 },
                    { day: 'Tue', condition: 'partly-cloudy', high: 20, low: 13 },
                    { day: 'Wed', condition: 'rainy',         high: 16, low: 11 },
                    { day: 'Thu', condition: 'cloudy',        high: 18, low: 12 },
                    { day: 'Fri', condition: 'sunny',         high: 24, low: 15 },
                ],
            },
            children: [],
        },

        'sep-1': { type: 'Separator', props: {}, children: [] },
        'sep-2': { type: 'Separator', props: {}, children: [] },
        'sep-3': { type: 'Separator', props: {}, children: [] },
        'sep-4': { type: 'Separator', props: {}, children: [] },
        'sep-5': { type: 'Separator', props: {}, children: [] },
        'sep-6': { type: 'Separator', props: {}, children: [] },
        'sep-7': { type: 'Separator', props: {}, children: [] },
        'sep-8': { type: 'Separator', props: {}, children: [] },
        'sep-9':  { type: 'Separator', props: {}, children: [] },
        'sep-10': { type: 'Separator', props: {}, children: [] },
        'sep-11': { type: 'Separator', props: {}, children: [] },
        'sep-12': { type: 'Separator', props: {}, children: [] },
        'sep-13': { type: 'Separator', props: {}, children: [] },
        'sep-14': { type: 'Separator', props: {}, children: [] },
        'sep-15': { type: 'Separator', props: {}, children: [] },
        'sep-16': { type: 'Separator', props: {}, children: [] },
        'sep-17': { type: 'Separator', props: {}, children: [] },
        'sep-18': { type: 'Separator', props: {}, children: [] },
        'sep-19': { type: 'Separator', props: {}, children: [] },

        // ── Metrics Grid ─────────────────────────────────────────────────────
        'grid-metrics': { type: 'Grid', props: { columns: 4, gap: 'md' }, children: ['card-tasks', 'card-done', 'card-focus', 'card-streak'] },

        'card-tasks':  { type: 'Card', props: { title: 'Total Tasks', description: null }, children: ['m-tasks'] },
        'card-done':   { type: 'Card', props: { title: 'Completed', description: null }, children: ['m-done'] },
        'card-focus':  { type: 'Card', props: { title: 'Focus Time', description: null }, children: ['m-focus'] },
        'card-streak': { type: 'Card', props: { title: 'Streak', description: null }, children: ['m-streak'] },

        'm-tasks':  { type: 'Metric', props: { label: 'Active', value: '12', detail: '3 high priority', trend: 'up' }, children: [] },
        'm-done':   { type: 'Metric', props: { label: 'Today', value: '7', detail: '+2 from yesterday', trend: 'up' }, children: [] },
        'm-focus':  { type: 'Metric', props: { label: 'Hours', value: '4.5h', detail: 'Goal: 6h', trend: 'neutral' }, children: [] },
        'm-streak': { type: 'Metric', props: { label: 'Days', value: '14', detail: 'Personal best!', trend: 'up' }, children: [] },

        // ── Table ────────────────────────────────────────────────────────────
        'table-tasks': {
            type: 'Table',
            props: {
                data: [
                    { task: 'Fix ui-web4 streaming', priority: 'High', status: 'Done', time: '2h' },
                    { task: 'Add daily report page', priority: 'High', status: 'Done', time: '1.5h' },
                    { task: 'Update MEMORY.md', priority: 'Medium', status: 'Done', time: '0.5h' },
                    { task: 'Write unit tests', priority: 'Medium', status: 'In Progress', time: '1h' },
                    { task: 'Deploy to staging', priority: 'Low', status: 'Pending', time: '—' },
                    { task: 'Code review PR #42', priority: 'High', status: 'Pending', time: '—' },
                ],
                columns: [
                    { key: 'task', label: 'Task' },
                    { key: 'priority', label: 'Priority' },
                    { key: 'status', label: 'Status' },
                    { key: 'time', label: 'Time Spent' },
                ],
                emptyMessage: 'No tasks today',
            },
            children: [],
        },

        // ── Timeline ─────────────────────────────────────────────────────────
        'timeline-day': {
            type: 'Timeline',
            props: {
                items: [
                    { title: 'Morning standup', description: 'Team sync, reviewed sprint goals', date: '09:00', status: 'completed' },
                    { title: 'Fix SSE streaming bug', description: 'Proxy now forwards full events', date: '10:00', status: 'completed' },
                    { title: 'Build ui-web4 integration', description: 'Catalog, registry, renderer done', date: '11:30', status: 'completed' },
                    { title: 'Lunch break', description: null, date: '13:00', status: 'completed' },
                    { title: 'Daily report page', description: 'Adding mock demo with all components', date: '14:00', status: 'current' },
                    { title: 'Code review', description: 'Review open PRs', date: '16:00', status: 'upcoming' },
                    { title: 'End of day wrap-up', description: 'Update task statuses', date: '18:00', status: 'upcoming' },
                ],
            },
            children: [],
        },

        // ── Tabs ─────────────────────────────────────────────────────────────
        'tabs-reports': {
            type: 'Tabs',
            props: { defaultValue: 'today', tabs: [{ value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'notes', label: 'Notes' }] },
            children: ['tab-today', 'tab-week', 'tab-notes'],
        },
        'tab-today': { type: 'TabContent', props: { value: 'today' }, children: ['callout-today'] },
        'tab-week':  { type: 'TabContent', props: { value: 'week' }, children: ['callout-week'] },
        'tab-notes': { type: 'TabContent', props: { value: 'notes' }, children: ['callout-notes'] },
        'callout-today': { type: 'Callout', props: { type: 'info', title: 'Today\'s Focus', content: 'Ship the ui-web4 integration and test all components with real AI output.' }, children: [] },
        'callout-week':  { type: 'Callout', props: { type: 'tip', title: 'Weekly Goal', content: 'Complete the Generative UI system, add 3D support, and test with Gemini CLI + Claude.' }, children: [] },
        'callout-notes': { type: 'Callout', props: { type: 'important', title: 'Important Note', content: 'Backend restart needed after every agentic-chat.ts change. Use restart-backend.ps1 script.' }, children: [] },

        // ── Charts Grid ──────────────────────────────────────────────────────
        'grid-charts': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-bar', 'card-line', 'card-pie'] },

        'card-bar': { type: 'Card', props: { title: 'Tasks by Day (BarChart)', description: null }, children: ['chart-bar'] },
        'chart-bar': {
            type: 'BarChart',
            props: {
                title: null,
                data: [
                    { day: 'Mon', tasks: 8 }, { day: 'Tue', tasks: 12 }, { day: 'Wed', tasks: 6 },
                    { day: 'Thu', tasks: 10 }, { day: 'Fri', tasks: 9 }, { day: 'Sat', tasks: 3 }, { day: 'Sun', tasks: 1 },
                ],
                xKey: 'day', yKey: 'tasks', color: '#6366f1', height: 200,
            },
            children: [],
        },

        'card-line': { type: 'Card', props: { title: 'Focus Hours (LineChart)', description: null }, children: ['chart-line'] },
        'chart-line': {
            type: 'LineChart',
            props: {
                title: null,
                data: [
                    { day: 'Mon', hours: 5 }, { day: 'Tue', hours: 4.5 }, { day: 'Wed', hours: 6 },
                    { day: 'Thu', hours: 3 }, { day: 'Fri', hours: 5.5 }, { day: 'Sat', hours: 2 }, { day: 'Sun', hours: 1 },
                ],
                xKey: 'day', yKey: 'hours', color: '#22d3ee', height: 200,
            },
            children: [],
        },

        'card-pie': { type: 'Card', props: { title: 'Task Types (PieChart)', description: null }, children: ['chart-pie'] },
        'chart-pie': {
            type: 'PieChart',
            props: {
                title: null,
                data: [
                    { type: 'Features', count: 6 }, { type: 'Bugs', count: 3 },
                    { type: 'Docs', count: 2 }, { type: 'Reviews', count: 1 },
                ],
                nameKey: 'type', valueKey: 'count', height: 200,
            },
            children: [],
        },

        // ── Trading Charts ───────────────────────────────────────────────────
        'grid-trading-charts': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['card-candlestick', 'card-options', 'card-portfolio-perf', 'card-allocation'] },

        'card-candlestick': { type: 'Card', props: { title: 'Stock Candlestick Chart', description: 'Professional OHLC chart with volume' }, children: ['chart-candlestick'] },
        'chart-candlestick': {
            type: 'StockCandlestickChart',
            props: {
                symbol: 'AAPL',
                data: [
                    { timestamp: '2024-01-01', open: 150.00, high: 155.50, low: 148.20, close: 153.40, volume: 1234567 },
                    { timestamp: '2024-01-02', open: 153.40, high: 158.90, low: 152.10, close: 156.80, volume: 1456789 },
                    { timestamp: '2024-01-03', open: 156.80, high: 159.20, low: 154.30, close: 155.60, volume: 1298765 },
                    { timestamp: '2024-01-04', open: 155.60, high: 157.40, low: 153.80, close: 154.20, volume: 1123456 },
                    { timestamp: '2024-01-05', open: 154.20, high: 156.70, low: 151.50, close: 156.30, volume: 1567890 },
                ],
                timeframe: '1D',
                showVolume: true,
                height: 500,
            },
            children: [],
        },

        'card-options': { type: 'Card', props: { title: 'Options Chain', description: 'Calls and Puts with Greeks' }, children: ['chart-options'] },
        'chart-options': {
            type: 'OptionsChainTable',
            props: {
                symbol: 'AAPL',
                expirationDate: '2024-03-15',
                currentPrice: 150.00,
                chains: [
                    {
                        strike: 145,
                        calls: { bid: 8.20, ask: 8.40, volume: 850, iv: 0.25, delta: 0.75 },
                        puts: { bid: 0.80, ask: 0.90, volume: 320, iv: 0.22, delta: -0.25 }
                    },
                    {
                        strike: 150,
                        calls: { bid: 5.20, ask: 5.30, volume: 1200, iv: 0.28, delta: 0.65 },
                        puts: { bid: 2.10, ask: 2.15, volume: 800, iv: 0.26, delta: -0.35 }
                    },
                    {
                        strike: 155,
                        calls: { bid: 2.80, ask: 2.90, volume: 650, iv: 0.30, delta: 0.45 },
                        puts: { bid: 4.50, ask: 4.60, volume: 920, iv: 0.29, delta: -0.55 }
                    },
                    {
                        strike: 160,
                        calls: { bid: 1.20, ask: 1.30, volume: 420, iv: 0.32, delta: 0.25 },
                        puts: { bid: 7.80, ask: 7.95, volume: 1100, iv: 0.31, delta: -0.75 }
                    },
                ],
                highlightATM: true,
                height: 400,
            },
            children: [],
        },

        'card-portfolio-perf': { type: 'Card', props: { title: 'Portfolio Performance', description: 'Portfolio vs S&P 500 benchmark' }, children: ['chart-portfolio-perf'] },
        'chart-portfolio-perf': {
            type: 'PortfolioPerformanceChart',
            props: {
                data: [
                    { date: '2024-01-01', portfolioValue: 10000, benchmarkValue: 10000 },
                    { date: '2024-02-01', portfolioValue: 10500, benchmarkValue: 10200 },
                    { date: '2024-03-01', portfolioValue: 11200, benchmarkValue: 10400 },
                    { date: '2024-04-01', portfolioValue: 10800, benchmarkValue: 10500 },
                    { date: '2024-05-01', portfolioValue: 11500, benchmarkValue: 10700 },
                    { date: '2024-06-01', portfolioValue: 12300, benchmarkValue: 11000 },
                ],
                showBenchmark: true,
                benchmarkName: 'S&P 500',
                showDrawdown: false,
                height: 400,
            },
            children: [],
        },

        'card-allocation': { type: 'Card', props: { title: 'Asset Allocation', description: 'Portfolio distribution by holdings' }, children: ['chart-allocation'] },
        'chart-allocation': {
            type: 'AssetAllocationPie',
            props: {
                holdings: [
                    { symbol: 'AAPL', name: 'Apple Inc.', value: 5000, percentage: 25 },
                    { symbol: 'TSLA', name: 'Tesla Inc.', value: 3000, percentage: 15 },
                    { symbol: 'MSFT', name: 'Microsoft Corp.', value: 4000, percentage: 20 },
                    { symbol: 'BTC', name: 'Bitcoin', value: 6000, percentage: 30 },
                    { symbol: 'ETH', name: 'Ethereum', value: 2000, percentage: 10 },
                ],
                showPercentages: true,
                interactive: true,
                height: 400,
            },
            children: [],
        },

        // ── Callouts ─────────────────────────────────────────────────────────
        'grid-callouts': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['callout-info', 'callout-tip', 'callout-warn', 'callout-imp'] },
        'callout-info': { type: 'Callout', props: { type: 'info',      title: 'Info Callout',      content: 'This is an informational message with useful context.' }, children: [] },
        'callout-tip':  { type: 'Callout', props: { type: 'tip',       title: 'Tip Callout',       content: 'Pro tip: use Grid with columns=2 for side-by-side callouts.' }, children: [] },
        'callout-warn': { type: 'Callout', props: { type: 'warning',   title: 'Warning Callout',   content: 'Backend needs restart after changing json-render-prompt.ts.' }, children: [] },
        'callout-imp':  { type: 'Callout', props: { type: 'important', title: 'Important Callout', content: 'Every agent now gets the spec format injected in its system prompt.' }, children: [] },

        // ── Accordion ────────────────────────────────────────────────────────
        'accordion-faq': {
            type: 'Accordion',
            props: {
                items: [
                    { title: 'How does ui-web4 work?', content: 'AI outputs JSON Patch operations inside a ```spec fence. The frontend parses them with createMixedStreamParser and renders components progressively as the stream arrives.' },
                    { title: 'Which agents support specs?', content: 'All agents: Claude (via agentic-chat.ts), Gemini CLI, and Ollama all receive the spec format instructions in their system prompt.' },
                    { title: 'Can I add custom components?', content: 'Yes — add to catalog.ts (Zod schema) and registry.tsx (React impl). The renderer picks them up automatically.' },
                ],
            },
            children: [],
        },

        // ── Badges ───────────────────────────────────────────────────────────
        'grid-badges': { type: 'Stack', props: { gap: 'sm', direction: 'horizontal' }, children: ['badge-def', 'badge-sec', 'badge-suc', 'badge-war', 'badge-des', 'badge-out'] },
        'badge-def': { type: 'Badge', props: { text: 'default',    variant: 'default' },    children: [] },
        'badge-sec': { type: 'Badge', props: { text: 'secondary',  variant: 'secondary' },  children: [] },
        'badge-suc': { type: 'Badge', props: { text: 'success',    variant: 'success' },    children: [] },
        'badge-war': { type: 'Badge', props: { text: 'warning',    variant: 'warning' },    children: [] },
        'badge-des': { type: 'Badge', props: { text: 'destructive',variant: 'destructive' },children: [] },
        'badge-out': { type: 'Badge', props: { text: 'outline',    variant: 'outline' },    children: [] },

        // ── Links + Text ─────────────────────────────────────────────────────
        'stack-links': { type: 'Stack', props: { gap: 'sm', direction: 'vertical' }, children: ['text-body', 'text-muted', 'link-gh', 'btn-demo'] },
        'text-body':  { type: 'Text', props: { content: 'This is regular body text at default size.', muted: false, size: 'base' }, children: [] },
        'text-muted': { type: 'Text', props: { content: 'This is muted small text used for descriptions and hints.', muted: true, size: 'sm' }, children: [] },
        'link-gh':    { type: 'Link', props: { text: 'Agent Player on GitHub', href: 'https://github.com' }, children: [] },
        'btn-demo':   { type: 'Button', props: { label: 'Button Component', variant: 'outline', size: 'default' }, children: [] },

        // ── New Components ────────────────────────────────────────────────────
        'heading-new': { type: 'Heading', props: { text: 'Progress Bars', level: 'h2' }, children: [] },
        'grid-progress': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-pb1', 'card-pb2', 'card-pb3'] },
        'card-pb1': { type: 'Card', props: { title: null, description: null }, children: ['pb-1'] },
        'card-pb2': { type: 'Card', props: { title: null, description: null }, children: ['pb-2'] },
        'card-pb3': { type: 'Card', props: { title: null, description: null }, children: ['pb-3'] },
        'pb-1': { type: 'ProgressBar', props: { label: 'Upload Progress', value: 65, max: null, color: 'success', showPercent: true }, children: [] },
        'pb-2': { type: 'ProgressBar', props: { label: 'Storage Used', value: 85, max: null, color: 'warning', showPercent: true }, children: [] },
        'pb-3': { type: 'ProgressBar', props: { label: 'CPU Load', value: 40, max: null, color: 'default', showPercent: true }, children: [] },

        // ── Alerts + UserCards ────────────────────────────────────────────────
        'heading-alerts-users': { type: 'Heading', props: { text: 'Alerts & User Cards', level: 'h2' }, children: [] },
        'grid-alerts': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['alert-info', 'alert-error'] },
        'alert-info':  { type: 'Alert', props: { title: 'New deployment ready', description: 'Version 1.3.1 has been built successfully and is ready to deploy.', variant: 'default' }, children: [] },
        'alert-error': { type: 'Alert', props: { title: 'Build failed', description: 'TypeScript error in agentic-chat.ts line 142. Fix before deploying.', variant: 'destructive' }, children: [] },

        'grid-users': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-u1', 'card-u2', 'card-u3'] },
        'card-u1': { type: 'Card', props: { title: null, description: null }, children: ['user-1'] },
        'card-u2': { type: 'Card', props: { title: null, description: null }, children: ['user-2'] },
        'card-u3': { type: 'Card', props: { title: null, description: null }, children: ['user-3'] },
        'user-1': { type: 'UserCard', props: { name: 'Alice Johnson', role: 'Lead Engineer', email: 'alice@example.com', src: null, size: 'md' }, children: [] },
        'user-2': { type: 'UserCard', props: { name: 'Bob Chen', role: 'Product Manager', email: null, src: null, size: 'md' }, children: [] },
        'user-3': { type: 'UserCard', props: { name: 'Sara Kim', role: 'Designer', email: 'sara@example.com', src: null, size: 'md' }, children: [] },

        // ── Switch Rows ───────────────────────────────────────────────────────
        'heading-switches': { type: 'Heading', props: { text: 'Toggle Switches', level: 'h2' }, children: [] },
        'stack-switches': { type: 'Stack', props: { gap: 'sm', direction: 'vertical' }, children: ['sw-1', 'sw-2', 'sw-3'] },
        'sw-1': { type: 'SwitchRow', props: { label: 'Dark Mode', description: 'Toggle dark theme across the app', checked: true }, children: [] },
        'sw-2': { type: 'SwitchRow', props: { label: 'Email Notifications', description: 'Receive daily digest emails', checked: false }, children: [] },
        'sw-3': { type: 'SwitchRow', props: { label: 'Auto-save', description: null, checked: true }, children: [] },

        // ── Area Chart ────────────────────────────────────────────────────────
        'card-area': { type: 'Card', props: { title: 'Revenue This Month (AreaChart)', description: null }, children: ['chart-area'] },
        'chart-area': {
            type: 'AreaChart',
            props: {
                title: null,
                data: [
                    { day: '1', revenue: 1200 }, { day: '5', revenue: 1800 }, { day: '10', revenue: 1500 },
                    { day: '15', revenue: 2400 }, { day: '20', revenue: 2100 }, { day: '25', revenue: 3000 }, { day: '28', revenue: 2800 },
                ],
                xKey: 'day', yKey: 'revenue', color: '#22d3ee', height: 220, gradient: true,
            },
            children: [],
        },

        // ── Form Inputs ───────────────────────────────────────────────────────
        'heading-forms': { type: 'Heading', props: { text: 'Form Inputs', level: 'h2' }, children: [] },
        'grid-forms': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-input', 'card-select', 'card-textarea'] },

        'card-input': { type: 'Card', props: { title: null, description: null }, children: ['form-input'] },
        'form-input': { type: 'InputField', props: { label: 'Full Name', placeholder: 'Enter your name', value: null, type: 'text', description: 'Used for display in profile.' }, children: [] },

        'card-select': { type: 'Card', props: { title: null, description: null }, children: ['form-select'] },
        'form-select': {
            type: 'SelectField',
            props: {
                label: 'Role',
                options: [{ value: 'owner', label: 'Owner' }, { value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }, { value: 'guest', label: 'Guest' }],
                value: 'user',
                placeholder: 'Select a role',
                description: 'Determines access level.',
            },
            children: [],
        },

        'card-textarea': { type: 'Card', props: { title: null, description: null }, children: ['form-textarea'] },
        'form-textarea': { type: 'TextArea', props: { label: 'Notes', placeholder: 'Write your notes here...', value: null, rows: 3, description: null }, children: [] },

        // ── Selection Controls ─────────────────────────────────────────────────
        'heading-selection': { type: 'Heading', props: { text: 'Selection & Controls', level: 'h2' }, children: [] },
        'grid-selection': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-checkbox', 'card-radio', 'card-slider'] },

        'card-checkbox': { type: 'Card', props: { title: 'Task List (CheckboxList)', description: null }, children: ['form-checkbox'] },
        'form-checkbox': {
            type: 'CheckboxList',
            props: {
                items: [
                    { id: 'cb1', label: 'Fix streaming bug', checked: true, disabled: null },
                    { id: 'cb2', label: 'Add new components', checked: true, disabled: null },
                    { id: 'cb3', label: 'Write documentation', checked: false, disabled: null },
                    { id: 'cb4', label: 'Deploy to staging', checked: false, disabled: true },
                ],
            },
            children: [],
        },

        'card-radio': { type: 'Card', props: { title: 'Plan (RadioGroup)', description: null }, children: ['form-radio'] },
        'form-radio': {
            type: 'RadioGroup',
            props: {
                label: 'Choose your plan',
                options: [
                    { value: 'free', label: 'Free — 5 agents' },
                    { value: 'pro', label: 'Pro — 20 agents' },
                    { value: 'enterprise', label: 'Enterprise — Unlimited' },
                ],
                value: 'pro',
                description: null,
            },
            children: [],
        },

        'card-slider': { type: 'Card', props: { title: 'Settings (SliderRow)', description: null }, children: ['stack-sliders'] },
        'stack-sliders': { type: 'Stack', props: { gap: 'md', direction: 'vertical' }, children: ['slider-vol', 'slider-bright'] },
        'slider-vol':    { type: 'SliderRow', props: { label: 'Volume', value: 70, min: null, max: null, step: null, showValue: true }, children: [] },
        'slider-bright': { type: 'SliderRow', props: { label: 'Brightness', value: 45, min: 0, max: 100, step: 5, showValue: true }, children: [] },

        // ── Skeleton + Calendar ────────────────────────────────────────────────
        'heading-misc': { type: 'Heading', props: { text: 'Skeleton & Calendar', level: 'h2' }, children: [] },
        'grid-misc': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-skel1', 'card-skel2', 'card-cal'] },

        'card-skel1': { type: 'Card', props: { title: 'Loading Text (Skeleton)', description: null }, children: ['skel-text'] },
        'skel-text':  { type: 'SkeletonBlock', props: { lines: 4, type: 'text' }, children: [] },

        'card-skel2': { type: 'Card', props: { title: 'Loading Cards (Skeleton)', description: null }, children: ['stack-skels'] },
        'stack-skels': { type: 'Stack', props: { gap: 'md', direction: 'vertical' }, children: ['skel-card', 'skel-avatar'] },
        'skel-card':   { type: 'SkeletonBlock', props: { lines: null, type: 'card' }, children: [] },
        'skel-avatar': { type: 'SkeletonBlock', props: { lines: null, type: 'avatar-row' }, children: [] },

        'card-cal': { type: 'Card', props: { title: null, description: null }, children: ['cal-view'] },
        'cal-view': { type: 'CalendarView', props: { title: 'Sprint Calendar', selectedDates: ['2026-02-18', '2026-02-20', '2026-02-25'] }, children: [] },

        // ── Toggles & ToggleGroup ──────────────────────────────────────────────
        'heading-toggles': { type: 'Heading', props: { text: 'Toggles & Segments', level: 'h2' }, children: [] },
        'grid-toggles': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-tb', 'card-tg', 'card-otp'] },

        'card-tb': { type: 'Card', props: { title: 'ToggleButton', description: null }, children: ['stack-toggles'] },
        'stack-toggles': { type: 'Stack', props: { gap: 'sm', direction: 'horizontal' }, children: ['tb-bold', 'tb-italic', 'tb-under'] },
        'tb-bold':  { type: 'ToggleButton', props: { label: 'Bold',      pressed: true,  variant: 'outline', size: 'sm' }, children: [] },
        'tb-italic':{ type: 'ToggleButton', props: { label: 'Italic',    pressed: false, variant: 'outline', size: 'sm' }, children: [] },
        'tb-under': { type: 'ToggleButton', props: { label: 'Underline', pressed: true,  variant: 'outline', size: 'sm' }, children: [] },

        'card-tg': { type: 'Card', props: { title: 'ToggleGroup (Segmented)', description: null }, children: ['tg-view', 'tg-period'] },
        'tg-view': {
            type: 'ToggleGroup',
            props: {
                label: 'View Mode',
                options: [{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }, { value: 'table', label: 'Table' }],
                value: 'grid', variant: 'outline',
            },
            children: [],
        },
        'tg-period': {
            type: 'ToggleGroup',
            props: {
                label: 'Period',
                options: [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }],
                value: 'week', variant: 'outline',
            },
            children: [],
        },

        'card-otp': { type: 'Card', props: { title: 'OTP Input', description: null }, children: ['otp-verify', 'otp-pin'] },
        'otp-verify': { type: 'OTPDisplay', props: { length: 6, label: 'Verification Code' }, children: [] },
        'otp-pin':    { type: 'OTPDisplay', props: { length: 4, label: 'PIN',                }, children: [] },

        // ── Navigation ────────────────────────────────────────────────────────
        'heading-nav': { type: 'Heading', props: { text: 'Navigation & Pagination', level: 'h2' }, children: [] },
        'grid-nav': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['card-bc', 'card-pg'] },

        'card-bc': { type: 'Card', props: { title: 'Breadcrumb', description: null }, children: ['bc-1', 'bc-2'] },
        'bc-1': {
            type: 'Breadcrumb',
            props: {
                items: [{ label: 'Dashboard', href: '/' }, { label: 'Reports', href: '/reports' }, { label: 'Daily Report', href: null }],
            },
            children: [],
        },
        'bc-2': {
            type: 'Breadcrumb',
            props: {
                items: [{ label: 'Projects', href: '/' }, { label: 'Agent Player', href: '/projects/agent' }, { label: 'src', href: null }],
            },
            children: [],
        },

        'card-pg': { type: 'Card', props: { title: 'Pagination', description: null }, children: ['pg-1', 'pg-2'] },
        'pg-1': { type: 'PaginationBar', props: { currentPage: 3,  totalPages: 10, showLabel: true  }, children: [] },
        'pg-2': { type: 'PaginationBar', props: { currentPage: 8,  totalPages: 10, showLabel: false }, children: [] },

        // ── HoverCard & Carousel ──────────────────────────────────────────────
        'heading-hover': { type: 'Heading', props: { text: 'HoverCard & Carousel', level: 'h2' }, children: [] },
        'grid-hover': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['card-hc', 'card-crl'] },

        'card-hc': { type: 'Card', props: { title: 'HoverCard (hover over names)', description: null }, children: ['text-hc'] },
        'text-hc': {
            type: 'Text',
            props: { content: 'Report prepared by @alice with contributions from @bob and @sara.', muted: false, size: 'base' },
            children: [],
        },

        'card-crl': { type: 'Card', props: { title: 'Carousel', description: null }, children: ['carousel-1'] },
        'carousel-1': {
            type: 'Carousel',
            props: {
                items: [
                    { title: 'Generative UI', description: 'AI outputs structured JSON specs rendered as React components', imageUrl: null },
                    { title: 'Multi-Agent Squad', description: '13 tools, cron scheduling, Kanban task board', imageUrl: null },
                    { title: 'CLI Bridge', description: 'gemini_cli + claude_cli tools — 18 total tools', imageUrl: null },
                    { title: 'Storage System', description: 'Unified cache + CDN with S3/R2/Local providers', imageUrl: null },
                ],
                autoPlay: null,
            },
            children: [],
        },

        // ── Collapsible & Panels ──────────────────────────────────────────────
        'heading-panels': { type: 'Heading', props: { text: 'Panels & Containers', level: 'h2' }, children: [] },
        'grid-panels': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-col', 'card-sp', 'card-dw'] },

        'card-col': { type: 'Card', props: { title: 'CollapsibleSection', description: null }, children: ['col-1', 'col-2'] },
        'col-1': { type: 'CollapsibleSection', props: { title: 'Advanced Settings', defaultOpen: false }, children: ['col-1-text'] },
        'col-1-text': { type: 'Text', props: { content: 'Hidden content shown when expanded. Great for optional details.', muted: true, size: 'sm' }, children: [] },
        'col-2': { type: 'CollapsibleSection', props: { title: 'System Info', defaultOpen: true }, children: ['col-2-text'] },
        'col-2-text': { type: 'Text', props: { content: 'Version 1.3.0 — Backend 41522 — Frontend 41521', muted: true, size: 'sm' }, children: [] },

        'card-sp': { type: 'Card', props: { title: 'SidePanel', description: null }, children: ['sp-1'] },
        'sp-1': {
            type: 'SidePanel',
            props: { title: 'Details Panel', description: 'View full item details', side: 'right' },
            children: ['sp-content'],
        },
        'sp-content': { type: 'Stack', props: { gap: 'sm', direction: 'vertical' }, children: ['sp-m1', 'sp-m2', 'sp-m3'] },
        'sp-m1': { type: 'Metric', props: { label: 'Status', value: 'Active', detail: null, trend: 'up' }, children: [] },
        'sp-m2': { type: 'Metric', props: { label: 'Uptime', value: '99.9%', detail: '30-day avg', trend: 'neutral' }, children: [] },
        'sp-m3': { type: 'Metric', props: { label: 'Errors', value: '0', detail: 'Last 24h', trend: 'down' }, children: [] },

        'card-dw': { type: 'Card', props: { title: 'DrawerCard + ScrollBox + Tooltip', description: null }, children: ['dw-1', 'tooltip-row'] },
        'dw-1': {
            type: 'DrawerCard',
            props: { title: 'Quick Actions', description: 'Common operations' },
            children: ['dw-btns'],
        },
        'dw-btns': { type: 'Stack', props: { gap: 'sm', direction: 'horizontal' }, children: ['dw-btn1', 'dw-btn2'] },
        'dw-btn1': { type: 'Button', props: { label: 'Deploy', variant: 'default', size: 'sm' }, children: [] },
        'dw-btn2': { type: 'Button', props: { label: 'Rollback', variant: 'outline', size: 'sm' }, children: [] },
        'tooltip-row': { type: 'Stack', props: { gap: 'sm', direction: 'horizontal' }, children: ['tt-1', 'tt-2'] },
        'tt-1': { type: 'TooltipText', props: { text: 'P99 Latency', tooltip: '99th percentile response time across all endpoints', muted: false }, children: [] },
        'tt-2': { type: 'TooltipText', props: { text: 'TTB',        tooltip: 'Time To First Byte — measures server response speed', muted: true }, children: [] },

        // ── Dialogs ───────────────────────────────────────────────────────────
        'heading-dialogs': { type: 'Heading', props: { text: 'Dialogs & Dropdowns', level: 'h2' }, children: [] },
        'grid-dialogs': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['card-ald', 'card-dlg', 'card-dd'] },

        'card-ald': { type: 'Card', props: { title: null, description: null }, children: ['alert-dlg'] },
        'alert-dlg': {
            type: 'AlertDialogCard',
            props: { title: 'Delete All Logs?', description: 'This will permanently remove 14 days of logs. This action cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel', variant: 'destructive' },
            children: [],
        },

        'card-dlg': { type: 'Card', props: { title: null, description: null }, children: ['dlg-card'] },
        'dlg-card': { type: 'DialogCard', props: { title: 'Edit Agent Settings', description: 'Adjust the agent behavior and tools.' }, children: ['dlg-content'] },
        'dlg-content': { type: 'Stack', props: { gap: 'sm', direction: 'vertical' }, children: ['dlg-inp', 'dlg-sw'] },
        'dlg-inp': { type: 'InputField', props: { label: 'Agent Name', placeholder: 'my-agent', value: 'max', type: 'text', description: null }, children: [] },
        'dlg-sw': { type: 'SwitchRow', props: { label: 'Enable tools', description: null, checked: true }, children: [] },

        'card-dd': { type: 'Card', props: { title: null, description: null }, children: ['dd-1'] },
        'dd-1': {
            type: 'DropdownList',
            props: {
                label: 'Actions',
                items: [
                    { label: 'Edit', shortcut: 'E', disabled: null, separator: null },
                    { label: 'Duplicate', shortcut: 'D', disabled: null, separator: null },
                    { label: 'Share', shortcut: null, disabled: null, separator: null },
                    { label: 'Delete', shortcut: '⌫', disabled: false, separator: true },
                ],
            },
            children: [],
        },

        // ── Command Search ────────────────────────────────────────────────────
        'heading-command': { type: 'Heading', props: { text: 'Command Palette', level: 'h2' }, children: [] },
        'grid-command': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['card-cmd1', 'card-cmd2'] },

        'card-cmd1': { type: 'Card', props: { title: null, description: null }, children: ['cmd-1'] },
        'cmd-1': {
            type: 'CommandSearch',
            props: {
                placeholder: 'Search commands...',
                groups: [
                    {
                        heading: 'Navigation',
                        items: [{ label: 'Go to Dashboard', shortcut: 'G D' }, { label: 'Go to Agents', shortcut: 'G A' }, { label: 'Go to Tasks', shortcut: 'G T' }],
                    },
                    {
                        heading: 'Actions',
                        items: [{ label: 'New Chat', shortcut: 'Ctrl+K' }, { label: 'Restart Backend', shortcut: null }, { label: 'View Logs', shortcut: null }],
                    },
                ],
            },
            children: [],
        },

        'card-cmd2': { type: 'Card', props: { title: null, description: null }, children: ['cmd-2'] },
        'cmd-2': {
            type: 'CommandSearch',
            props: {
                placeholder: 'Search files...',
                groups: [
                    {
                        heading: 'Recent Files',
                        items: [{ label: 'agentic-chat.ts', shortcut: null }, { label: 'registry.tsx', shortcut: null }, { label: 'catalog.ts', shortcut: null }],
                    },
                    {
                        heading: 'Quick Actions',
                        items: [{ label: 'Build Project', shortcut: 'Ctrl+B' }, { label: 'Run Tests', shortcut: 'Ctrl+T' }],
                    },
                ],
            },
            children: [],
        },

        // ── Resizable & AspectBox ──────────────────────────────────────────────
        'heading-layout': { type: 'Heading', props: { text: 'Resizable & Aspect Ratio', level: 'h2' }, children: [] },
        'grid-layout': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['card-rp', 'card-aspect'] },

        'card-rp': { type: 'Card', props: { title: 'ResizablePanel (drag handle)', description: null }, children: ['rp-1'] },
        'rp-1': {
            type: 'ResizablePanel',
            props: { direction: 'horizontal', leftLabel: 'Editor', rightLabel: 'Preview', defaultSplit: 55 },
            children: ['rp-content'],
        },
        'rp-content': { type: 'Text', props: { content: 'const agent = new Agent();\nagent.run();', muted: true, size: 'sm' }, children: [] },

        'card-aspect': { type: 'Card', props: { title: 'AspectBox (16:9 + 1:1)', description: null }, children: ['stack-aspect'] },
        'stack-aspect': { type: 'Stack', props: { gap: 'md', direction: 'vertical' }, children: ['asp-video', 'asp-square'] },
        'asp-video':  { type: 'AspectBox', props: { ratio: 1.78, label: '16:9 Video Frame', bg: 'bg-gradient-to-br from-indigo-500/20 to-cyan-500/20' }, children: [] },
        'asp-square': { type: 'AspectBox', props: { ratio: 1, label: '1:1 Square', bg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' }, children: [] },

        // ── File Formats ─────────────────────────────────────────────────────
        'sep-20': { type: 'Separator', props: {}, children: [] },
        'heading-fileformats': { type: 'Heading', props: { text: 'File Formats — JSON / MD / MDC', level: 'h2' }, children: [] },
        'grid-fileformats': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['card-json', 'card-md', 'card-mdc'] },

        'card-json': {
            type: 'Card',
            props: { title: 'JsonViewer — structured data', description: null },
            children: ['json-viewer-1'],
        },
        'json-viewer-1': {
            type: 'JsonViewer',
            props: {
                title: 'API Response',
                data: {
                    status: 'ok',
                    version: '1.3.0',
                    user: { id: 42, name: 'Alice', admin: true },
                    tags: ['editor', 'beta'],
                    score: 98.5,
                    extra: null,
                },
                maxHeight: 280,
                defaultExpanded: true,
            },
            children: [],
        },

        'card-md': {
            type: 'Card',
            props: { title: 'MarkdownBlock — rich text', description: null },
            children: ['md-block-1'],
        },
        'md-block-1': {
            type: 'MarkdownBlock',
            props: {
                content: `## Quick Summary\n\nThis is **bold**, *italic*, and \`inline code\`.\n\n### Features\n\n- JsonViewer: collapsible JSON tree\n- MarkdownBlock: formatted markdown\n- MDCBlock: markdown + components\n\n> Tip: Use MDCBlock to mix prose and UI.\n\n\`\`\`ts\nconst result = await agent.run();\n\`\`\``,
                prose: null,
            },
            children: [],
        },

        'card-mdc': {
            type: 'Card',
            props: { title: 'MDCBlock — markdown + components', description: null },
            children: ['mdc-block-1'],
        },
        'mdc-block-1': {
            type: 'MDCBlock',
            props: {
                content: `## Agent Status\n\nCurrent deployment metrics:\n\n::Metric{label="Uptime" value="99.9%" trend="up"}\n\n::Metric{label="Errors" value="0" trend="neutral"}\n\n::Badge{text="Production" variant="success"}\n\nAll systems operational.`,
            },
            children: [],
        },

        // ── Avatar ────────────────────────────────────────────────────────────
        'sep-21': { type: 'Separator', props: {}, children: [] },
        'heading-avatar': { type: 'Heading', props: { text: 'AvatarCard — Interactive 3D Avatar', level: 'h2' }, children: [] },
        'grid-avatar': { type: 'Stack', props: { direction: 'horizontal', gap: 'md' }, children: ['av-md', 'av-lg'] },

        'av-md': { type: 'AvatarCard', props: { title: null, size: 'md', removable: true }, children: [] },
        'av-lg': { type: 'AvatarCard', props: { title: null, size: 'lg', removable: true }, children: [] },

        // ── SupportChatBlock ──────────────────────────────────────────────────
        'sep-22': { type: 'Separator', props: {}, children: [] },
        'heading-scb': { type: 'Heading', props: { text: 'SupportChatBlock — Chat Widget with 3D Avatar', level: 'h2' }, children: [] },
        'grid-scb': { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['scb-default', 'scb-dark', 'scb-blue'] },

        'scb-default': { type: 'SupportChatBlock', props: { agentName: 'Assistant', height: 480, removable: true, bgColor: null }, children: [] },
        'scb-dark':    { type: 'SupportChatBlock', props: { agentName: 'Max', height: 480, removable: true, bgColor: '#0f172a' }, children: [] },
        'scb-blue':    { type: 'SupportChatBlock', props: { agentName: 'Support', height: 480, removable: false, bgColor: 'linear-gradient(135deg,#1e3a5f,#0f172a)' }, children: [] },

        // ── AgentSupportPortal ────────────────────────────────────────────────
        'sep-23': { type: 'Separator', props: {}, children: [] },
        'heading-asp': { type: 'Heading', props: { text: 'AgentSupportPortal — Agent Picker + Chat', level: 'h2' }, children: [] },
        'grid-asp': { type: 'Grid', props: { columns: 2, gap: 'md' }, children: ['asp-default', 'asp-dark'] },
        'asp-default': { type: 'AgentSupportPortal', props: { height: 520, bgColor: null, title: 'Choose your assistant' }, children: [] },
        'asp-dark':    { type: 'AgentSupportPortal', props: { height: 520, bgColor: '#0f172a', title: 'Who do you want to talk to?' }, children: [] },
    },
};

// ─── Category filter chips ─────────────────────────────────────────────────────

const CATEGORIES = [
    { id: 'weather',   label: 'Weather',    heading: 'WeatherCard' },
    { id: 'avatar',    label: 'Avatar',     heading: 'AvatarCard' },
    { id: 'chat',      label: 'Chat',       heading: 'SupportChatBlock' },
    { id: 'portal',    label: 'Portal',     heading: 'AgentSupportPortal' },
    { id: 'metrics',   label: 'Metrics',    heading: 'Task Summary' },
    { id: 'timeline',  label: 'Timeline',   heading: "Today's Timeline" },
    { id: 'charts',    label: 'Charts',     heading: 'Charts' },
    { id: 'progress',  label: 'Progress',   heading: 'Progress Bars' },
    { id: 'alerts',    label: 'Alerts',     heading: 'Alerts & User Cards' },
    { id: 'switches',  label: 'Switches',   heading: 'Toggle Switches' },
    { id: 'forms',     label: 'Forms',      heading: 'Form Inputs' },
    { id: 'selection', label: 'Selection',  heading: 'Selection & Controls' },
    { id: 'misc',      label: 'Misc',       heading: 'Other Components' },
    { id: 'skeleton',  label: 'Skeleton',   heading: 'Skeleton & Calendar' },
    { id: 'toggles',   label: 'Toggles',    heading: 'Toggles & Segments' },
    { id: 'nav',       label: 'Navigation', heading: 'Navigation & Pagination' },
    { id: 'hover',     label: 'HoverCard',  heading: 'HoverCard & Carousel' },
    { id: 'panels',    label: 'Panels',     heading: 'Panels & Containers' },
    { id: 'dialogs',   label: 'Dialogs',    heading: 'Dialogs & Dropdowns' },
    { id: 'command',   label: 'Command',    heading: 'Command Palette' },
    { id: 'layout',    label: 'Layout',     heading: 'Resizable & Aspect Ratio' },
    { id: 'files',          label: 'Files',          heading: 'File Formats' },
    { id: 'notifications',  label: 'Notifications',  heading: 'Notification Types' },
];

// ─── Notification type definitions (27 types) ─────────────────────────────────

const NOTIF_TYPES = [
  { type: 'msg',       label: 'Message',       color: '#6366f1', desc: 'Generic message or chat notification' },
  { type: 'task',      label: 'Task',          color: '#8b5cf6', desc: 'Task assigned or updated' },
  { type: 'approval',  label: 'Approval',      color: '#f59e0b', desc: 'Requires user approval action' },
  { type: 'email',     label: 'Email',         color: '#3b82f6', desc: 'New email received' },
  { type: 'whatsapp',  label: 'WhatsApp',      color: '#25d366', desc: 'WhatsApp message' },
  { type: 'facebook',  label: 'Facebook',      color: '#1877f2', desc: 'Facebook notification' },
  { type: 'instagram', label: 'Instagram',     color: '#e1306c', desc: 'Instagram activity' },
  { type: 'telegram',  label: 'Telegram',      color: '#229ed9', desc: 'Telegram message' },
  { type: 'discord',   label: 'Discord',       color: '#5865f2', desc: 'Discord message or mention' },
  { type: 'twitter',   label: 'Twitter / X',   color: '#1da1f2', desc: 'Tweet, reply, or mention' },
  { type: 'tiktok',    label: 'TikTok',        color: '#fe2c55', desc: 'TikTok like, comment, or follow' },
  { type: 'linkedin',  label: 'LinkedIn',      color: '#0a66c2', desc: 'LinkedIn connection or message' },
  { type: 'snapchat',  label: 'Snapchat',      color: '#fffc00', desc: 'Snapchat snap or story' },
  { type: 'youtube',   label: 'YouTube',       color: '#ff0000', desc: 'YouTube comment or subscription' },
  { type: 'reddit',    label: 'Reddit',        color: '#ff4500', desc: 'Reddit post or comment' },
  { type: 'twitch',    label: 'Twitch',        color: '#9146ff', desc: 'Twitch stream event or message' },
  { type: 'stripe',    label: 'Stripe',        color: '#635bff', desc: 'Payment received via Stripe' },
  { type: 'paypal',    label: 'PayPal',        color: '#003087', desc: 'PayPal transaction' },
  { type: 'bank',      label: 'Bank',          color: '#10b981', desc: 'Bank transaction or alert' },
  { type: 'applepay',  label: 'Apple Pay',     color: '#1c1c1e', desc: 'Apple Pay transaction' },
  { type: 'stock',     label: 'Stock',         color: '#f97316', desc: 'Stock price alert' },
  { type: 'calendar',  label: 'Calendar',      color: '#0ea5e9', desc: 'Calendar event reminder' },
  { type: 'terminal',  label: 'Terminal',      color: '#22c55e', desc: 'Command requiring approval + output' },
  { type: 'gif',       label: 'GIF',           color: '#ec4899', desc: 'Animated GIF notification' },
  { type: 'otp',       label: 'OTP Code',      color: '#a855f7', desc: '6-digit OTP with copy button' },
  { type: 'faceid',    label: 'Face ID',       color: '#06b6d4', desc: 'Biometric authentication request' },
  { type: 'sms_otp',   label: 'SMS OTP',       color: '#84cc16', desc: 'SMS OTP code with phone hint' },
] as const;

// ─── Notification section component ───────────────────────────────────────────

function NotificationsSection() {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-1" id="heading-notifications">Notification Types</h2>
      <p className="text-xs text-muted-foreground mb-4">
        27 notification types available in the avatar viewer. Each has a unique visual style and behaviour.
        Click <strong>Try</strong> to preview it live.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {NOTIF_TYPES.map(n => (
          <div
            key={n.type}
            className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors"
            style={{ borderLeftWidth: 3, borderLeftColor: n.color }}
          >
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold mt-0.5"
              style={{ background: n.color }}
            >
              {n.label.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{n.label}</span>
                <a
                  href={`/avatar-viewer?notif=${n.type}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors flex-shrink-0"
                >
                  Try
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.desc}</p>
              <code className="text-[9px] text-muted-foreground/60 font-mono">{n.type}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component catalog for search ─────────────────────────────────────────────

const COMPONENT_CATALOG = [
    { name: 'WeatherCard', heading: 'WeatherCard' },
    { name: 'Metric', heading: 'Task Summary' },
    { name: 'Table', heading: 'Task Summary' },
    { name: 'Timeline', heading: "Today's Timeline" },
    { name: 'BarChart', heading: 'Charts' },
    { name: 'LineChart', heading: 'Charts' },
    { name: 'PieChart', heading: 'Charts' },
    { name: 'StockCandlestickChart', heading: 'Trading Charts' },
    { name: 'OptionsChainTable', heading: 'Trading Charts' },
    { name: 'PortfolioPerformanceChart', heading: 'Trading Charts' },
    { name: 'AssetAllocationPie', heading: 'Trading Charts' },
    { name: 'AreaChart', heading: 'Revenue' },
    { name: 'Callout', heading: 'Other Components' },
    { name: 'Accordion', heading: 'Other Components' },
    { name: 'Badge', heading: 'Other Components' },
    { name: 'ProgressBar', heading: 'Progress Bars' },
    { name: 'Alert', heading: 'Alerts & User Cards' },
    { name: 'UserCard', heading: 'Alerts & User Cards' },
    { name: 'SwitchRow', heading: 'Toggle Switches' },
    { name: 'InputField', heading: 'Form Inputs' },
    { name: 'SelectField', heading: 'Form Inputs' },
    { name: 'TextArea', heading: 'Form Inputs' },
    { name: 'CheckboxList', heading: 'Selection & Controls' },
    { name: 'RadioGroup', heading: 'Selection & Controls' },
    { name: 'SliderRow', heading: 'Selection & Controls' },
    { name: 'SkeletonBlock', heading: 'Skeleton & Calendar' },
    { name: 'CalendarView', heading: 'Skeleton & Calendar' },
    { name: 'ToggleButton', heading: 'Toggles & Segments' },
    { name: 'ToggleGroup', heading: 'Toggles & Segments' },
    { name: 'OTPDisplay', heading: 'Toggles & Segments' },
    { name: 'Breadcrumb', heading: 'Navigation & Pagination' },
    { name: 'PaginationBar', heading: 'Navigation & Pagination' },
    { name: 'Carousel', heading: 'HoverCard & Carousel' },
    { name: 'CollapsibleSection', heading: 'Panels & Containers' },
    { name: 'SidePanel', heading: 'Panels & Containers' },
    { name: 'DrawerCard', heading: 'Panels & Containers' },
    { name: 'TooltipText', heading: 'Panels & Containers' },
    { name: 'AlertDialogCard', heading: 'Dialogs & Dropdowns' },
    { name: 'DialogCard', heading: 'Dialogs & Dropdowns' },
    { name: 'DropdownList', heading: 'Dialogs & Dropdowns' },
    { name: 'CommandSearch', heading: 'Command Palette' },
    { name: 'ResizablePanel', heading: 'Resizable & Aspect Ratio' },
    { name: 'AspectBox', heading: 'Resizable & Aspect Ratio' },
    { name: 'JsonViewer', heading: 'File Formats' },
    { name: 'MarkdownBlock', heading: 'File Formats' },
    { name: 'MDCBlock', heading: 'File Formats' },
    { name: 'AvatarCard', heading: 'AvatarCard' },
    { name: 'SupportChatBlock', heading: 'SupportChatBlock' },
    { name: 'AgentSupportPortal', heading: 'AgentSupportPortal' },
    // Notification types
    ...NOTIF_TYPES.map(n => ({ name: n.label, heading: 'Notification Types' })),
];

// ─── Page ─────────────────────────────────────────────────────────────────────

type PreviewTheme = 'system' | 'light' | 'dark' | 'glass-light' | 'glass-dark';

const THEME_OPTIONS = [
    { id: 'light', icon: Sun, label: 'Light', color: 'text-amber-500' },
    { id: 'system', icon: Monitor, label: 'System', color: 'text-primary' },
    { id: 'dark', icon: Moon, label: 'Dark', color: 'text-blue-400' },
] as const;

// Color presets for glass effect background
const COLOR_PRESETS = [
    {
        id: 'purple-pink',
        name: 'Purple Pink',
        light: 'from-purple-400/40 via-pink-300/30 to-cyan-400/40',
        dark: 'from-purple-900/60 via-indigo-900/40 to-cyan-900/50',
        orbs: ['bg-purple-500/30', 'bg-cyan-500/20', 'bg-pink-500/20'],
        preview: 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500',
    },
    {
        id: 'ocean',
        name: 'Ocean',
        light: 'from-blue-400/40 via-cyan-300/30 to-teal-400/40',
        dark: 'from-blue-900/60 via-cyan-900/40 to-teal-900/50',
        orbs: ['bg-blue-500/30', 'bg-cyan-500/25', 'bg-teal-500/20'],
        preview: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500',
    },
    {
        id: 'sunset',
        name: 'Sunset',
        light: 'from-orange-400/40 via-rose-300/30 to-pink-400/40',
        dark: 'from-orange-900/60 via-rose-900/40 to-pink-900/50',
        orbs: ['bg-orange-500/30', 'bg-rose-500/25', 'bg-pink-500/20'],
        preview: 'bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500',
    },
    {
        id: 'forest',
        name: 'Forest',
        light: 'from-green-400/40 via-emerald-300/30 to-teal-400/40',
        dark: 'from-green-900/60 via-emerald-900/40 to-teal-900/50',
        orbs: ['bg-green-500/30', 'bg-emerald-500/25', 'bg-teal-500/20'],
        preview: 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500',
    },
    {
        id: 'aurora',
        name: 'Aurora',
        light: 'from-violet-400/40 via-fuchsia-300/30 to-sky-400/40',
        dark: 'from-violet-900/60 via-fuchsia-900/40 to-sky-900/50',
        orbs: ['bg-violet-500/30', 'bg-fuchsia-500/25', 'bg-sky-500/20'],
        preview: 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-500',
    },
    {
        id: 'midnight',
        name: 'Midnight',
        light: 'from-slate-400/40 via-zinc-300/30 to-gray-400/40',
        dark: 'from-slate-900/70 via-zinc-900/50 to-gray-900/60',
        orbs: ['bg-slate-500/20', 'bg-zinc-500/15', 'bg-gray-500/15'],
        preview: 'bg-gradient-to-r from-slate-600 via-zinc-600 to-gray-600',
    },
];

export default function UiComponentsPage() {
    const [spec, setSpec] = useState<Spec | null>(MOCK_SPEC);
    const [textContent, setTextContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('system');
    const [glassEffect, setGlassEffect] = useState(false);
    const [colorPreset, setColorPreset] = useState(COLOR_PRESETS[0]);
    const [showColorPanel, setShowColorPanel] = useState(false);
    const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile' | 'watch'>('desktop');
    const [containerWidth, setContainerWidth] = useState(1200);
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Device widths for zoom simulation
    const DEVICE_WIDTHS = { desktop: 0, tablet: 768, mobile: 390, watch: 198 } as const;

    // Measure outer scroll container so we can compute the zoom scale
    React.useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            const w = entries[0]?.contentRect.width;
            if (w && w > 0) setContainerWidth(w);
        });
        ro.observe(el);
        setContainerWidth(el.getBoundingClientRect().width || 1200);
        return () => ro.disconnect();
    }, []);

    // Get container styles based on theme
    const getPreviewStyles = () => {
        const baseTheme = previewTheme.replace('glass-', '') as 'system' | 'light' | 'dark';
        const isGlass = glassEffect;

        let bgStyle = '';
        let textStyle = '';
        let borderStyle = '';
        let wrapperBg = '';
        let orbs = colorPreset.orbs;

        if (baseTheme === 'light') {
            if (isGlass) {
                // Glass mode - transparent container, gradient wrapper with selected colors
                bgStyle = '';
                borderStyle = '';
                wrapperBg = `bg-gradient-to-br ${colorPreset.light}`;
            } else {
                bgStyle = 'bg-white';
                borderStyle = '';
            }
            textStyle = 'text-zinc-900';
        } else if (baseTheme === 'dark') {
            if (isGlass) {
                // Glass mode - transparent container, gradient wrapper with selected colors
                bgStyle = '';
                borderStyle = '';
                wrapperBg = `bg-gradient-to-br ${colorPreset.dark}`;
            } else {
                bgStyle = 'bg-zinc-950';
                borderStyle = '';
            }
            textStyle = 'text-zinc-50';
        }

        return { bgStyle, textStyle, borderStyle, wrapperBg, orbs, isDark: baseTheme === 'dark', isGlass };
    };

    const filteredComponents = searchQuery.trim()
        ? COMPONENT_CATALOG.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.heading.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [];

    const scrollToHeading = (heading: string) => {
        const content = contentRef.current;
        if (!content) return;
        const headings = content.querySelectorAll('h1, h2, h3, h4');
        for (const el of headings) {
            if (el.textContent?.toLowerCase().includes(heading.toLowerCase())) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                break;
            }
        }
    };

    const scrollToComponent = (heading: string) => {
        scrollToHeading(heading);
        setSearchQuery('');
        setShowSuggestions(false);
    };

    const handleCategoryClick = (catId: string, heading: string) => {
        setActiveSection(prev => prev === catId ? null : catId);
        scrollToHeading(heading);
    };

    const generateWithAI = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setSpec(null);
        setTextContent('');

        let currentSpec: Spec = { root: '', elements: {} };
        let textAccum = '';
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const prompt = `Generate a showcase of UI components for developer preview (today: ${today}). Include WeatherCard, Metric cards, a Table, Timeline, Charts, and various ui-web4 components. Use json-render spec to make it visually rich.`;

        const mixedParser = createMixedStreamParser({
            onText: (text: string) => {
                if (!text.trim()) return;
                textAccum += text + '\n';
                setTextContent(textAccum);
            },
            onPatch: (patch: SpecStreamLine) => {
                currentSpec = { ...applySpecPatch(currentSpec, patch) };
                setSpec({ ...currentSpec });
            },
        });

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
            });
            if (!res.ok) throw new Error('Failed to generate');

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let lineBuffer = '';
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    lineBuffer += decoder.decode(value, { stream: true });
                    const events = lineBuffer.split('\n\n');
                    lineBuffer = events.pop() ?? '';
                    for (const event of events) {
                        for (const line of event.split('\n')) {
                            if (!line.startsWith('data:')) continue;
                            const raw = line.slice(5).trim();
                            if (!raw) continue;
                            try {
                                const json = JSON.parse(raw);
                                const content = (!json.type && json.content) ? json.content
                                    : (json.type === 'text' ? json.content : null);
                                if (content) mixedParser.push(content);
                            } catch { /* skip */ }
                        }
                    }
                }
                mixedParser.flush();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate');
            setSpec(MOCK_SPEC);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="shrink-0">
                    <h1 className="text-lg font-semibold leading-tight">UI Components</h1>
                    <p className="text-xs text-muted-foreground">{COMPONENT_CATALOG.length} components</p>
                </div>

                {/* Search */}
                <div ref={searchRef} className="relative flex-1 max-w-sm ml-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search components..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        className="pl-9 pr-8 h-9"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {showSuggestions && filteredComponents.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-lg border bg-popover shadow-md overflow-hidden">
                            {filteredComponents.slice(0, 8).map(c => (
                                <button
                                    key={c.name}
                                    onMouseDown={() => scrollToComponent(c.heading)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left"
                                >
                                    <span className="font-medium">{c.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2 truncate">{c.heading}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {showSuggestions && searchQuery.trim() && filteredComponents.length === 0 && (
                        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-lg border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
                            No components found
                        </div>
                    )}
                </div>

                {/* Appearance Settings Button */}
                <button
                    onClick={() => setShowColorPanel(!showColorPanel)}
                    className={`
                        flex items-center gap-2 px-3 h-9 rounded-lg border transition-all text-sm font-medium
                        ${showColorPanel || previewTheme !== 'system' || glassEffect
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'}
                    `}
                    title="Appearance settings"
                >
                    <Palette className="h-4 w-4" />
                    Appearance
                    {(previewTheme !== 'system' || glassEffect) && (
                        <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                    )}
                </button>

                {/* Device preview selector */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
                    {([
                        { mode: 'desktop', icon: Monitor,    title: 'Desktop (full width)' },
                        { mode: 'tablet',  icon: Tablet,     title: 'Tablet (768px)' },
                        { mode: 'mobile',  icon: Smartphone, title: 'Mobile (390px)' },
                        { mode: 'watch',   icon: Watch,      title: 'Apple Watch (198px)' },
                    ] as const).map(({ mode, icon: Icon, title }) => (
                        <button
                            key={mode}
                            onClick={() => setDeviceMode(mode)}
                            title={title}
                            className={`flex items-center justify-center w-8 h-7 rounded-md transition-all ${
                                deviceMode === mode
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSpec(MOCK_SPEC)} className="gap-2">
                        <FlaskConical className="h-4 w-4" />
                        Demo
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateWithAI} disabled={isLoading} className="gap-2">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {isLoading ? 'Generating...' : 'AI Generate'}
                    </Button>
                </div>
            </div>

            {/* Category filter chips */}
            <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
                <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <button
                    onClick={() => setActiveSection(null)}
                    className={[
                        'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                        activeSection === null
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                    ].join(' ')}
                >
                    All
                </button>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id, cat.heading)}
                        className={[
                            'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                            activeSection === cat.id
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                        ].join(' ')}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Main content area with optional sidebar */}
            <div className="flex flex-1 overflow-hidden">
                {/* Appearance Sidebar */}
                {showColorPanel && (
                    <div className="w-72 border-r border-border bg-card overflow-y-auto shrink-0">
                        <div className="p-4 space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Settings2 className="h-4 w-4" />
                                    Appearance
                                </h3>
                                <button
                                    onClick={() => setShowColorPanel(false)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Theme Section */}
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Theme
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setPreviewTheme('light')}
                                        className={`
                                            flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                                            ${previewTheme === 'light'
                                                ? 'border-amber-500 bg-amber-500/10'
                                                : 'border-border hover:border-foreground/30'}
                                        `}
                                    >
                                        <Sun className={`h-5 w-5 ${previewTheme === 'light' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                        <span className="text-xs font-medium">Light</span>
                                    </button>
                                    <button
                                        onClick={() => setPreviewTheme('system')}
                                        className={`
                                            flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                                            ${previewTheme === 'system'
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-foreground/30'}
                                        `}
                                    >
                                        <Monitor className={`h-5 w-5 ${previewTheme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="text-xs font-medium">System</span>
                                    </button>
                                    <button
                                        onClick={() => setPreviewTheme('dark')}
                                        className={`
                                            flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                                            ${previewTheme === 'dark'
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-border hover:border-foreground/30'}
                                        `}
                                    >
                                        <Moon className={`h-5 w-5 ${previewTheme === 'dark' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                        <span className="text-xs font-medium">Dark</span>
                                    </button>
                                </div>
                            </div>

                            {/* Glass Effect Section */}
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Effects
                                </label>
                                <button
                                    onClick={() => setGlassEffect(!glassEffect)}
                                    className={`
                                        w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all
                                        ${glassEffect
                                            ? 'border-purple-500 bg-gradient-to-r from-purple-500/10 to-cyan-500/10'
                                            : 'border-border hover:border-foreground/30'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <Sparkles className={`h-5 w-5 ${glassEffect ? 'text-purple-500' : 'text-muted-foreground'}`} />
                                        <div className="text-left">
                                            <p className="text-sm font-medium">Glass Effect</p>
                                            <p className="text-xs text-muted-foreground">Frosted glass on components</p>
                                        </div>
                                    </div>
                                    <div className={`
                                        w-10 h-6 rounded-full transition-colors flex items-center px-1
                                        ${glassEffect ? 'bg-purple-500' : 'bg-muted'}
                                    `}>
                                        <div className={`
                                            w-4 h-4 rounded-full bg-white transition-transform
                                            ${glassEffect ? 'translate-x-4' : 'translate-x-0'}
                                        `} />
                                    </div>
                                </button>
                            </div>

                            {/* Color Presets Section - Only show when glass is enabled */}
                            {glassEffect && previewTheme !== 'system' && (
                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Background Colors
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {COLOR_PRESETS.map(preset => (
                                            <button
                                                key={preset.id}
                                                onClick={() => setColorPreset(preset)}
                                                className={`
                                                    relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                                                    ${colorPreset.id === preset.id
                                                        ? 'border-primary ring-2 ring-primary/20'
                                                        : 'border-border hover:border-foreground/30'}
                                                `}
                                            >
                                                <div className={`w-full h-8 rounded-md ${preset.preview}`} />
                                                <span className="text-xs font-medium">{preset.name}</span>
                                                {colorPreset.id === preset.id && (
                                                    <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reset Button */}
                            {(previewTheme !== 'system' || glassEffect) && (
                                <button
                                    onClick={() => {
                                        setPreviewTheme('system');
                                        setGlassEffect(false);
                                        setColorPreset(COLOR_PRESETS[0]);
                                    }}
                                    className="w-full py-2 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                >
                                    Reset to Default
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Content */}
            {(() => {
                const { bgStyle, textStyle, borderStyle, wrapperBg, orbs, isDark, isGlass } = getPreviewStyles();
                return (
                    <div ref={scrollRef} className={`flex-1 overflow-auto relative ${isGlass && previewTheme !== 'system' ? wrapperBg : ''}`}>
                        {/* Device mode indicator bar */}
                        {deviceMode !== 'desktop' && (
                            <div className="sticky top-0 z-30 flex items-center justify-center gap-1.5 py-1 border-b border-border bg-background/90 backdrop-blur-sm text-[11px] text-muted-foreground">
                                {deviceMode === 'tablet' && <><Tablet className="h-3 w-3" /><span>iPad — 768 px</span></>}
                                {deviceMode === 'mobile' && <><Smartphone className="h-3 w-3" /><span>iPhone — 390 px</span></>}
                                {deviceMode === 'watch'  && <><Watch className="h-3 w-3" /><span>Apple Watch — Notifications &amp; Actions</span></>}
                            </div>
                        )}
                        {/* Animated gradient orbs for glass effect background */}
                        {isGlass && previewTheme !== 'system' && (
                            <>
                                <div className={`absolute top-20 left-20 w-72 h-72 ${orbs[0]} rounded-full blur-3xl animate-pulse pointer-events-none`} />
                                <div className={`absolute bottom-20 right-20 w-96 h-96 ${orbs[1]} rounded-full blur-3xl animate-pulse pointer-events-none`} style={{ animationDelay: '1s' }} />
                                <div className={`absolute top-1/2 left-1/2 w-64 h-64 ${orbs[2]} rounded-full blur-3xl animate-pulse pointer-events-none`} style={{ animationDelay: '2s' }} />
                            </>
                        )}
                        {/* Watch mode: dedicated watch frame showcase (not a zoomed component list) */}
                        {deviceMode === 'watch' && <WatchShowcase />}

                        <div
                            ref={contentRef}
                            className={`
                                relative z-10 px-6 py-6
                                ${deviceMode === 'watch' ? 'hidden' : ''}
                                ${previewTheme !== 'system' && !isGlass ? `${bgStyle} ${borderStyle}` : ''}
                                ${previewTheme !== 'system' ? textStyle : ''}
                                ${isDark ? 'dark' : ''}
                                ${isGlass && previewTheme !== 'system' ? 'glass-components' : ''}
                            `}
                            style={{
                                // Device simulation: constrain to device width so CSS breakpoints apply naturally (no zoom)
                                ...(deviceMode !== 'desktop' && deviceMode !== 'watch' ? {
                                    width: `${DEVICE_WIDTHS[deviceMode]}px`,
                                    maxWidth: '100%',
                                    margin: '0 auto',
                                } : { width: '100%' }),
                                ...(previewTheme !== 'system' ? {
                                // Force CSS variables for proper component theming
                                ['--background' as string]: isDark
                                    ? (isGlass ? 'transparent' : '0 0% 3.9%')
                                    : (isGlass ? 'transparent' : '0 0% 100%'),
                                ['--foreground' as string]: isDark ? '0 0% 98%' : '0 0% 3.9%',
                                ['--card' as string]: isDark
                                    ? (isGlass ? '240 10% 10% / 0.6' : '0 0% 3.9%')
                                    : (isGlass ? '0 0% 100% / 0.6' : '0 0% 100%'),
                                ['--card-foreground' as string]: isDark ? '0 0% 98%' : '0 0% 3.9%',
                                ['--muted' as string]: isDark
                                    ? (isGlass ? '240 6% 20% / 0.5' : '0 0% 14.9%')
                                    : (isGlass ? '0 0% 96% / 0.5' : '0 0% 96.1%'),
                                ['--muted-foreground' as string]: isDark ? '0 0% 63.9%' : '0 0% 45.1%',
                                ['--border' as string]: isDark
                                    ? (isGlass ? '0 0% 100% / 0.1' : '0 0% 14.9%')
                                    : (isGlass ? '0 0% 0% / 0.1' : '0 0% 89.8%'),
                                ['--input' as string]: isDark
                                    ? (isGlass ? '240 6% 20% / 0.4' : '0 0% 14.9%')
                                    : (isGlass ? '0 0% 100% / 0.4' : '0 0% 89.8%'),
                                ['--primary' as string]: isDark ? '0 0% 98%' : '0 0% 9%',
                                ['--primary-foreground' as string]: isDark ? '0 0% 9%' : '0 0% 98%',
                                ['--secondary' as string]: isDark
                                    ? (isGlass ? '240 6% 15% / 0.5' : '0 0% 14.9%')
                                    : (isGlass ? '0 0% 96% / 0.5' : '0 0% 96.1%'),
                                ['--secondary-foreground' as string]: isDark ? '0 0% 98%' : '0 0% 9%',
                                ['--accent' as string]: isDark
                                    ? (isGlass ? '240 6% 20% / 0.4' : '0 0% 14.9%')
                                    : (isGlass ? '0 0% 96% / 0.4' : '0 0% 96.1%'),
                                ['--accent-foreground' as string]: isDark ? '0 0% 98%' : '0 0% 9%',
                                ['--destructive' as string]: isDark ? '0 62.8% 30.6%' : '0 84.2% 60.2%',
                                ['--destructive-foreground' as string]: isDark ? '0 0% 98%' : '0 0% 98%',
                                ['--ring' as string]: isDark ? '0 0% 83.1%' : '0 0% 3.9%',
                                colorScheme: isDark ? 'dark' : 'light',
                            } : {})}}
                        >
                        {/* Glass effect styles for components */}
                        {isGlass && previewTheme !== 'system' && (
                            <style>{`
                                .glass-components [class*="rounded-lg"],
                                .glass-components [class*="rounded-xl"],
                                .glass-components .card,
                                .glass-components [data-slot="card"] {
                                    backdrop-filter: blur(16px) saturate(180%);
                                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                                    box-shadow: 0 8px 32px rgba(0, 0, 0, ${isDark ? '0.3' : '0.1'}),
                                                inset 0 1px 0 rgba(255, 255, 255, ${isDark ? '0.1' : '0.4'});
                                }
                                .glass-components table {
                                    backdrop-filter: blur(12px);
                                    -webkit-backdrop-filter: blur(12px);
                                }
                            `}</style>
                        )}
                        {/* Theme indicator badge */}
                        {previewTheme !== 'system' && (
                            <div className="mb-4 flex items-center gap-2 flex-wrap">
                                <span className={`
                                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                    ${previewTheme === 'light'
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}
                                `}>
                                    {previewTheme === 'light' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                                    {previewTheme === 'light' ? 'Light Mode' : 'Dark Mode'}
                                </span>
                                {glassEffect && (
                                    <span className={`
                                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                        ${isDark
                                            ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-gradient-to-r from-purple-100 to-cyan-100 text-purple-700 border border-purple-200'}
                                    `}>
                                        <Sparkles className="h-3 w-3" />
                                        Glass Effect
                                    </span>
                                )}
                                <button
                                    onClick={() => { setPreviewTheme('system'); setGlassEffect(false); }}
                                    className={`text-xs underline ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                                >
                                    Reset
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
                                {error}
                            </div>
                        )}

                        {isLoading && !spec?.root && (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-muted-foreground text-sm">Generating components with AI...</p>
                            </div>
                        )}

                        {textContent && (
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap mb-4 leading-relaxed">
                                {textContent}
                            </div>
                        )}

                        {spec?.root && (
                            <SpecRenderer spec={spec} loading={isLoading} />
                        )}

                        {/* Notifications section — always visible */}
                        <NotificationsSection />
                        </div>
                    </div>
                );
            })()}
            </div>
        </div>
    );
}
