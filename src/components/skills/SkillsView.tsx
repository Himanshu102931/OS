import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { SkillOverrideModal } from './SkillOverrideModal';
import type { TopicSkillState, Topic } from '../../types';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';

export const SkillsView: React.FC = () => {
  const { domains, topics, skillStates, updateSkillState } = usePlacement();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>('all');

  const freshnessBadges: Record<string, string> = {
    untested: 'bg-rose-950 text-rose-300 border-rose-800/60',
    fresh: 'bg-emerald-950 text-emerald-300 border-emerald-800/60',
    aging: 'bg-amber-950 text-amber-300 border-amber-800/60',
    stale: 'bg-rose-950 text-rose-300 border-rose-800/60',
  };

  const filteredDomains = domains.filter((d) => {
    if (filterDomain !== 'all' && d.id !== filterDomain) return false;
    return true;
  });

  const handleOpenOverride = (top: Topic) => {
    setSelectedTopic(top);
    setIsModalOpen(true);
  };

  const handleSubmitOverride = (updated: TopicSkillState) => {
    updateSkillState(updated);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            <span>Skill Analytics & Freshness Matrix</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Placement Skills Matrix</h2>
          <p className="text-sm text-slate-400 mt-1">
            Skill status across all 11 placement domains backed by recorded evidence strength.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-xs">
          <span className="text-slate-400 font-medium px-2">Domain:</span>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="bg-slate-950 text-slate-200 font-bold p-1 rounded border border-slate-800 focus:outline-none"
          >
            <option value="all">All 11 Domains</option>
            {domains.map((dom) => (
              <option key={dom.id} value={dom.id}>
                {dom.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Domain Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDomains.map((dom) => {
          const domainTopics = topics.filter((t) => t.domainId === dom.id);

          return (
            <div key={dom.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-100">{dom.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{dom.description}</p>
                </div>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                  {dom.shortName}
                </span>
              </div>

              {/* Topics under domain */}
              <div className="space-y-2 pt-1">
                {domainTopics.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">No topics assigned yet</div>
                ) : (
                  domainTopics.map((top) => {
                    const sk = skillStates[top.id] || {
                      topicId: top.id,
                      domainId: dom.id,
                      freshness: 'untested',
                      evidenceStrength: 0,
                    };

                    return (
                      <div
                        key={top.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{top.name}</div>
                          <div className="text-slate-400 text-[11px]">Importance: {top.importance}/10</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right space-y-1">
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border block ${
                                freshnessBadges[sk.freshness]
                              }`}
                            >
                              {sk.freshness}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 block">
                              Score: <strong className="text-slate-200">{sk.evidenceStrength}/100</strong>
                            </span>
                          </div>

                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleOpenOverride(top)}
                            className="text-xs text-slate-400 hover:text-purple-300"
                            title="Manual Rating Override"
                          >
                            <SlidersHorizontal className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Skill Rating Modal */}
      <SkillOverrideModal
        topic={selectedTopic}
        skillState={selectedTopic ? skillStates[selectedTopic.id] : undefined}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitOverride={handleSubmitOverride}
      />
    </div>
  );
};
