import React, { useState } from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { SkillOverrideModal } from './SkillOverrideModal';
import type { TopicSkillState, Topic } from '../../types';
import { Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';

export const SkillsView: React.FC = () => {
  const { domains, topics, skillStates, updateSkillState } = usePlacement();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>('all');

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Skills Matrix
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Recorded skill mastery and freshness states across all 11 placement domains
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs">
          <Filter className="size-3.5 text-zinc-400" />
          <span className="text-zinc-500 font-medium">Domain:</span>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="all" className="bg-zinc-900">All 11 Domains</option>
            {domains.map((dom) => (
              <option key={dom.id} value={dom.id} className="bg-zinc-900">
                {dom.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Skills Matrix Table */}
      <div className="app-surface overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          <div className="col-span-4">Topic / Skill</div>
          <div className="col-span-3">Domain</div>
          <div className="col-span-2">Evidence</div>
          <div className="col-span-2">Freshness</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {filteredDomains.flatMap((dom) => {
            const domainTopics = topics.filter((t) => t.domainId === dom.id);
            return domainTopics.map((top) => {
              const sk = skillStates[top.id] || {
                topicId: top.id,
                domainId: dom.id,
                freshness: 'untested',
                evidenceStrength: 0,
              };

              return (
                <div key={top.id} className="app-table-row p-3 sm:px-4 sm:py-2.5 space-y-1 sm:space-y-0">
                  <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 text-xs">
                    <div className="sm:col-span-4">
                      <span className="font-semibold text-zinc-100">{top.name}</span>
                      <span className="text-zinc-500 text-[11px] ml-2">({top.importance}/10)</span>
                    </div>

                    <div className="sm:col-span-3 text-zinc-400 text-xs">
                      {dom.name}
                    </div>

                    <div className="sm:col-span-2 font-mono text-zinc-300">
                      {sk.evidenceStrength} / 100
                    </div>

                    <div className="sm:col-span-2">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border capitalize ${
                          sk.freshness === 'fresh'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            : sk.freshness === 'aging'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                        }`}
                      >
                        {sk.freshness}
                      </span>
                    </div>

                    <div className="sm:col-span-1 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleOpenOverride(top)}
                        className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-200"
                        title="Override Rating"
                      >
                        <SlidersHorizontal className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            });
          })}
        </div>
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
