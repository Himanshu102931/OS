import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import { Settings, Database, Cpu, HardDrive } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { todayDate, taskDefinitions, dsaProblems, companyOverlays } = usePlacement();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Settings className="size-3.5" />
          <span>System & Architecture Specs</span>
        </div>
        <h2 className="text-2xl font-bold text-white mt-1">PlacementOS Configuration</h2>
        <p className="text-sm text-slate-400 mt-1">
          Local system storage status, architecture settings, and schema information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: System Storage Info */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <HardDrive className="size-5 text-blue-400" />
            Storage Adapter
          </h3>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Persistence Mode</span>
              <span className="font-mono text-emerald-400 font-bold">Local-First (localStorage)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Schema Version</span>
              <span className="font-mono text-slate-200">v1.0.0</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Local Browser Date</span>
              <span className="font-mono text-amber-400">{todayDate}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Cloud Sync / Auth</span>
              <span className="font-mono text-slate-400">Disabled (Zero Server)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Deterministic Adaptive Engine Info */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Cpu className="size-5 text-indigo-400" />
            Adaptive Engine Rules
          </h3>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Engine Type</span>
              <span className="font-mono text-indigo-300 font-bold">Rule-Driven Deterministic</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Runtime LLM / AI</span>
              <span className="font-mono text-rose-400">Disabled (V1 Spec)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Total Priority Weight</span>
              <span className="font-mono text-slate-200">1.00 (6 Components)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Leitner System</span>
              <span className="font-mono text-slate-200">4-Box (1, 3, 7, 14 days)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Inventory */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <Database className="size-5 text-emerald-400" />
          Seeded Entity Inventory
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-slate-400 block mb-1">Task Definitions</span>
            <span className="text-lg font-bold font-mono text-blue-400">{taskDefinitions.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-slate-400 block mb-1">DSA Problems</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{dsaProblems.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-slate-400 block mb-1">Company Overlays</span>
            <span className="text-lg font-bold font-mono text-amber-400">{companyOverlays.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-slate-400 block mb-1">Core Domains</span>
            <span className="text-lg font-bold font-mono text-purple-400">11</span>
          </div>
        </div>
      </div>
    </div>
  );
};
