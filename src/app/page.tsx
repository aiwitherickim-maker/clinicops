'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, TopBar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { PatientChatSimulator } from '@/components/PatientChatSimulator';
import { StaffReviewInbox } from '@/components/StaffReviewInbox';
import { BackOfficeCommandCenter } from '@/components/BackOfficeCommandCenter';
import { BackofficeDrafts } from '@/components/BackofficeDrafts';
import { Tasks } from '@/components/Tasks';
import { ClinicSetup } from '@/components/ClinicSetup';
import { INBOX } from '@/data/mockMessages';
import { TASKS } from '@/data/mockTasks';
import type { InboxMessage } from '@/types';
import { getInboxMessages } from '@/services/clinicDataService';

type Section = 'dashboard' | 'chat' | 'inbox' | 'command' | 'drafts' | 'tasks' | 'setup';

export default function Home() {
  const [section, setSection] = useState<Section>('dashboard');
  const [inbox, setInbox] = useState<InboxMessage[]>(INBOX);

  const refreshInbox = useCallback(() => {
    getInboxMessages().then(setInbox);
  }, []);

  // Load on mount
  useEffect(() => { refreshInbox(); }, [refreshInbox]);

  // Re-fetch every time the user navigates to the inbox tab
  useEffect(() => {
    if (section === 'inbox') refreshInbox();
  }, [section, refreshInbox]);

  const reviewCount = inbox.filter(
    (m) => m.risk === 'high' || m.status?.toLowerCase().includes('review')
  ).length;
  const taskCount = TASKS.filter((tk) => tk.status !== 'Resolved').length;

  // The component handles the DB resolve + event log itself.
  // This callback just syncs the parent's inbox count for the sidebar badge.
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
          {section === 'drafts'    && <BackofficeDrafts />}
          {section === 'tasks'     && <Tasks />}
          {section === 'setup'     && <ClinicSetup />}
        </div>
      </div>
    </div>
  );
}
