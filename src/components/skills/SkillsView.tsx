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
    untested: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    fresh: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    aging: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    stale: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
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
          <div className="inline-flex items-center gap-2 text-xs font-extrabold text-purple-400 uppercase tracking-widest px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
            <Sparkles className="size-3.5" />
            <span>Skill Analytics & Freshness Matrix</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Placement Skills Matrix
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-1">
            Skill status across all 11 placement domains backed by recorded evidence strength.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 text-xs shadow-inner">
          <span className="text-slate-400 font-medium px-2">Domain:</span>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="bg-slate-950 text-slate-100 font-bold p-1.5 rounded-xl border border-slate-800 focus:outline-none"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDomains.map((dom) => {
          const domainTopics = topics.filter((t) => t.domainId === dom.id);

          return (
            <div key={dom.id} className="glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">{dom.name}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{dom.description}</p>
                </div>
                <span className="text-xs font-extrabold font-mono px-3 py-1 rounded-xl bg-purple-950/60 text-purple-300 border border-purple-500/30">
                  {dom.shortName}
                </span>
              </div>

              {/* Topics under domain */}
              <div className="space-y-3 pt-1">
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
                        className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2 hover:border-purple-500/40 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-100">{top.name}</div>
                            <div className="text-slate-400 text-[11px] font-medium">Importance: {top.importance}/10</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right space-y-1">
                              <span
                                className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border block ${
                                  freshnessBadges[sk.freshness]
                                }`}
                              >
                                {sk.freshness}
                              </span>
                              <span className="text-[11px] font-mono font-semibold text-slate-300 block">
                                Score: <strong className="text-purple-400">{sk.evidenceStrength}/100</strong>
                              </span>
                            </div>

                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleOpenOverride(top)}
                              className="text-xs text-slate-400 hover:text-purple-300 p-2"
                              title="Manual Rating Override"
                            >
                              <SlidersHorizontal className="size-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Visual Strength Meter */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div
                            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-400 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${sk.evidenceStrength}%` }}
                          />
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
