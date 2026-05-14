'use client';

import React, { useState, useEffect } from 'react';
import { TASKS, TASK_FILTERS } from '@/data/mockTasks';
import type { Task } from '@/types';
import { Button, Badge, IconTile } from './Primitives';
import { IconRefresh, IconPlus, IconFilter, IconChevronDown, IconClock, IconBot, IconShieldCheck } from './Icons';
import { getTaskList, updateTaskStatusById } from '@/services/clinicDataService';

export function Tasks() {
  const [filter, setFilter] = useState('all');
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  useEffect(() => {
    getTaskList().then(setTasks);
  }, []);

  const filtered = tasks.filter((t) => {
    if (filter === 'all')     return true;
    if (filter === 'pending') return t.status === 'Pending approval';
    return t.category === filter;
  });

  const approve = (id: string) => {
    setTasks((list) =>
      list.map((t) => t.id === id ? { ...t, status: 'Open', statusTone: 'neutral' } : t)
    );
    updateTaskStatusById(id, 'open');
  };

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="lede">Every task here was created by ClinicOps from a patient message, a draft, or a back-office trigger — and is waiting on a human.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" size="sm"><IconRefresh size={14} /> Refresh</Button>
          <Button variant="primary" size="sm"><IconPlus size={14} /> New task</Button>
        </div>
      </div>

      {/* Filters + summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div className="filter-bar">
          {TASK_FILTERS.map((f) => {
            const count = f.key === 'all'
              ? tasks.length
              : f.key === 'pending'
                ? tasks.filter(t => t.status === 'Pending approval').length
                : tasks.filter(t => t.category === f.key).length;
            return (
              <button
                key={f.key}
                className={`chip${filter === f.key ? ' is-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} <span style={{ opacity: 0.7 }}>· {count}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm"><IconFilter size={13} /> More filters</Button>
          <Button variant="ghost" size="sm"><IconChevronDown size={13} /> Sort: Priority</Button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="task-table">
          <thead>
            <tr>
              <th style={{ width: '36%' }}>Task</th>
              <th>Source</th>
              <th>Assigned to</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due</th>
              <th style={{ textAlign: 'right' }}>AI created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="empty-state">No tasks match this filter.</td></tr>
            ) : filtered.map((t) => (
              <TaskRow key={t.id} t={t} onApprove={() => approve(t.id)} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--fg3)', fontSize: 12 }}>
        <IconShieldCheck size={14} /> Every AI-created task includes an audit trail and reasoning summary. Click any row to open.
      </div>
    </div>
  );
}

function TaskRow({ t, onApprove }: { t: Task; onApprove: () => void }) {
  return (
    <tr>
      <td>
        <div className="task-cell">
          <IconTile tone={t.tone} iconKey={t.iconKey} size="sm" />
          <div>
            <div className="t-title">{t.title}</div>
            <div className="t-sub">{t.sub}</div>
          </div>
        </div>
      </td>
      <td><span style={{ color: 'var(--fg2)', fontSize: 12.5 }}>{t.source}</span></td>
      <td>
        <div className="who-cell">
          <div className="av">{t.assignee.initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{t.assignee.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{t.assignee.role}</div>
          </div>
        </div>
      </td>
      <td><Badge tone={t.priorityTone} dot={t.priority === 'Urgent'}>{t.priority}</Badge></td>
      <td>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone={t.statusTone}>{t.status}</Badge>
          {t.hasDraft && t.status !== 'Resolved' && (
            <Badge tone="sage">Draft ready</Badge>
          )}
          {t.status === 'Pending approval' && (
            <button
              onClick={onApprove}
              style={{ background: 'transparent', border: 'none', color: 'var(--sage-deep)', cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}
            >
              Approve →
            </button>
          )}
        </div>
      </td>
      <td>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12.5,
          color: t.due === 'Today' ? '#A03A2D' : 'var(--fg2)',
          fontWeight: t.due === 'Today' ? 700 : 500,
        }}>
          <IconClock size={12} /> {t.due}
        </span>
      </td>
      <td style={{ textAlign: 'right' }}>
        {t.aiCreated && (
          <span className="ai-flag">
            <span className="av"><IconBot size={11} /></span>
            Yes
          </span>
        )}
      </td>
    </tr>
  );
}
