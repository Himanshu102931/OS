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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262D38]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            Skills Matrix & Readiness Assessment
          </h1>
          <p className="text-xs text-[#8E98A8] mt-1 font-mono">
            Recorded skill mastery and freshness states across all 11 placement domains
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2.5 bg-[#14171D] border border-[#262D38] rounded-[4px] px-3 py-1.5 text-xs font-mono">
          <Filter className="size-3.5 text-[#E5A93C]" />
          <span className="text-[#8E98A8] font-medium">Domain:</span>
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="bg-transparent text-[#F1F5F9] font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="all" className="bg-[#14171D]">All 11 Domains</option>
            {domains.map((dom) => (
              <option key={dom.id} value={dom.id} className="bg-[#14171D]">
                {dom.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Skills Matrix Table */}
      <div className="app-surface overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 bg-[#1B2028] border-b border-[#262D38] text-[11px] font-mono font-medium text-[#8E98A8] uppercase tracking-wider">
          <div className="col-span-4">Topic / Skill</div>
          <div className="col-span-3">Domain</div>
          <div className="col-span-2">Evidence</div>
          <div className="col-span-2">Freshness</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        <div className="divide-y divide-[#262D38]">
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
                <div key={top.id} className="app-table-row p-3.5 sm:px-4 sm:py-3 space-y-1 sm:space-y-0">
                  <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 text-xs">
                    <div className="sm:col-span-4">
                      <span className="font-semibold text-[#F1F5F9]">{top.name}</span>
                      <span className="text-[#8E98A8] font-mono text-[11px] ml-2">({top.importance}/10)</span>
                    </div>

                    <div className="sm:col-span-3 text-[#FFC665] font-mono text-xs">
                      {dom.name}
                    </div>

                    <div className="sm:col-span-2 font-mono text-[#F1F5F9] font-semibold">
                      {sk.evidenceStrength} / 100
                    </div>

                    <div className="sm:col-span-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] capitalize ${
                          sk.freshness === 'fresh'
                            ? 'tech-chip-success'
                            : sk.freshness === 'aging'
                            ? 'tech-chip-warning'
                            : 'tech-chip'
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
                        className="h-6 w-6 p-0 text-[#8E98A8] hover:text-[#F1F5F9] hover:bg-[#1B2028]"
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
