'use client';

import React, { useState } from 'react';
import { Sidebar, TopBar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { PatientChatSimulator } from '@/components/PatientChatSimulator';
import { StaffReviewInbox } from '@/components/StaffReviewInbox';
import { BackOfficeCommandCenter } from '@/components/BackOfficeCommandCenter';
import { Tasks } from '@/components/Tasks';
import { ClinicSetup } from '@/components/ClinicSetup';
import { INBOX } from '@/data/mockMessages';
import { TASKS } from '@/data/mockTasks';
import type { InboxMessage } from '@/types';

type Section = 'dashboard' | 'chat' | 'inbox' | 'command' | 'tasks' | 'setup';

export default function Home() {
  const [section, setSection] = useState<Section>('dashboard');
  const [inbox, setInbox] = useState<InboxMessage[]>(INBOX);

  const reviewCount = inbox.filter(
    (m) => m.risk === 'high' || m.status?.toLowerCase().includes('review')
  ).length;
  const taskCount = TASKS.filter((tk) => tk.status !== 'Resolved').length;

  const handleResolve = (msg: InboxMessage) => {
    setInbox((prev) => prev.filter((m) => m.id !== msg.id));
  };

  return (
    <div className="app">
      <Sidebar
        active={section}
        onSelect={(key) => setSection(key as Section)}
        reviewCount={reviewCount}
        taskCount={taskCount}
      />
      <div className="main">
        <TopBar section={section} />
        <div className="main-inner">
          {section === 'dashboard' && <Dashboard onNavigate={(key) => setSection(key as Section)} />}
          {section === 'chat'      && <PatientChatSimulator />}
          {section === 'inbox'     && (
            <StaffReviewInbox
              inbox={inbox}
              onResolve={handleResolve}
            />
          )}
          {section === 'command'   && <BackOfficeCommandCenter />}
          {section === 'tasks'     && <Tasks />}
          {section === 'setup'     && <ClinicSetup />}
        </div>
      </div>
    </div>
  );
}
