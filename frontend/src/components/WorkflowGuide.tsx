import React from 'react';
import type { Note } from '../types';
import './WorkflowGuide.css';

interface Props {
  notes: Note[];
  onNavigateToAnalysis: () => void;
}

export const WorkflowGuide: React.FC<Props> = ({ notes, onNavigateToAnalysis }) => {
  const characters = notes.filter(n => n.type === 'character');
  const details = notes.filter(n => n.type === 'detail');
  const chapters = notes.filter(n => n.type === 'chapter');

  const step1Complete = characters.length > 0 && characters.every(n => n.tags.length > 0) &&
                        details.length > 0 && details.every(n => n.tags.length > 0);
  const step1Progress = characters.length + details.length > 0 
    ? [...characters, ...details].filter(n => n.tags.length > 0).length 
    : 0;
  const step1Total = characters.length + details.length;

  const step2Complete = chapters.length > 0 && chapters.every(n => n.tags.length > 0);
  const step2Progress = chapters.filter(n => n.tags.length > 0).length;
  const step2Total = chapters.length;

  const step3Complete = chapters.length > 0 && chapters.every(n => (n._count?.sourceLinks || 0) + (n._count?.targetLinks || 0) > 0);
  const step3Progress = chapters.filter(n => (n._count?.sourceLinks || 0) + (n._count?.targetLinks || 0) > 0).length;
  const step3Total = chapters.length;

  const step4Complete = notes.every(n => !n.inconsistencies.some(i => i.status === 'active'));
  const activeInconsistencies = notes.reduce((acc, n) => acc + n.inconsistencies.filter(i => i.status === 'active').length, 0);

  const steps = [
    {
      id: 1,
      title: 'Character & Detail Tagging',
      desc: 'Populate master tag list.',
      complete: step1Complete,
      progress: `${step1Progress}/${step1Total}`,
      active: true
    },
    {
      id: 2,
      title: 'Chapter Scanning',
      desc: 'Tag characters in chapters.',
      complete: step2Complete,
      progress: `${step2Progress}/${step2Total}`,
      active: step1Complete
    },
    {
      id: 3,
      title: 'Establishing Links',
      desc: 'Formalize note links.',
      complete: step3Complete,
      progress: `${step3Progress}/${step3Total}`,
      active: step2Complete
    },
    {
      id: 4,
      title: 'Continuity Check',
      desc: 'Fix story contradictions.',
      complete: step4Complete,
      progress: activeInconsistencies > 0 ? `${activeInconsistencies} issues` : 'Clear',
      active: step3Complete
    },
    {
      id: 5,
      title: 'Global Analysis',
      desc: 'Run themes & subway map.',
      complete: false,
      progress: 'Ready',
      active: step4Complete,
      isFinal: true
    }
  ];

  return (
    <div className="workflow-guide glass-card">
      <div className="workflow-guide-header">
        <h3 className="workflow-guide-title">🚀 Analysis Journey</h3>
        <p className="workflow-guide-subtitle">Follow these steps to get the most accurate AI insights.</p>
      </div>
      <div className="workflow-steps">
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`workflow-step ${step.complete ? 'complete' : ''} ${step.active ? 'active' : 'locked'} ${step.isFinal && step.active ? 'final-call' : ''}`}
            onClick={step.isFinal && step.active ? onNavigateToAnalysis : undefined}
          >
            <div className="workflow-step-number">
              {step.complete ? '✓' : step.id}
            </div>
            <div className="workflow-step-content">
              <div className="workflow-step-top">
                <span className="workflow-step-title">{step.title}</span>
                <span className="workflow-step-badge">{step.progress}</span>
              </div>
              <p className="workflow-step-desc">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
