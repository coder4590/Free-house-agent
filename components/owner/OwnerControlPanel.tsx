'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, LayoutGrid, UtensilsCrossed, Rocket, 
  Shield, CheckCircle2, RefreshCw, Layers, 
  Sparkles, ExternalLink, ArrowRight, Store, Radio
} from 'lucide-react';
import VoicePersonaConfig from './VoicePersonaConfig';
import FloorPlanBuilder from './FloorPlanBuilder';
import MenuBuilder from './MenuBuilder';
import DeployPanel from './DeployPanel';
import { useOwnerConfig } from '@/lib/ownerConfigContext';
import { cn } from '@/lib/utils';

export type OwnerNavTab = 'voice' | 'floor' | 'menu' | 'deploy';

interface OwnerControlPanelProps {
  onSwitchToOperations?: () => void;
}

export default function OwnerControlPanel({ onSwitchToOperations }: OwnerControlPanelProps) {
  const [activeTab, setActiveTab] = useState<OwnerNavTab>('voice');
  const { 
    ownerConfig, 
    hasUnsavedChanges, 
    isDeploying, 
    deploySuccess, 
    saveAndDeploy,
    selectedVoice
  } = useOwnerConfig();

  const NAV_ITEMS = [
    {
      id: 'voice' as OwnerNavTab,
      label: 'Voice AI',
      subtitle: 'Persona & Timbre',
      icon: Bot
    },
    {
      id: 'floor' as OwnerNavTab,
      label: 'Floor Plan',
      subtitle: 'Spatial Seating Grid',
      icon: LayoutGrid
    },
    {
      id: 'menu' as OwnerNavTab,
      label: 'Menu Builder',
      subtitle: 'Recipe Matrix & 86',
      icon: UtensilsCrossed
    },
    {
      id: 'deploy' as OwnerNavTab,
      label: 'Deploy',
      subtitle: 'Audit & Live Sync',
      icon: Rocket
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black">
      {/* TOP STATUS BAR */}
      <header className="h-14 border-b border-[#22242A] bg-[#0E0F12]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#D4AF37] to-[#B38F24] flex items-center justify-center text-black font-bold text-xs shadow-[0_0_10px_rgba(212,175,55,0.25)]">
            SS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight">{ownerConfig.restaurant_name}</span>
              <span className="text-[10px] font-mono uppercase bg-[#181920] text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30">
                Owner Control Panel
              </span>
            </div>
          </div>
        </div>

        {/* Right side actions: Venue badge, Live switcher */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#131418] border border-[#22242A] rounded-lg text-xs font-mono text-zinc-400">
            <Radio size={12} className="text-emerald-400 animate-pulse" />
            <span className="text-zinc-300">{ownerConfig.venue || 'Main St'}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-[#D4AF37]">{selectedVoice.name} Voice</span>
          </div>

          {onSwitchToOperations && (
            <button
              type="button"
              onClick={onSwitchToOperations}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1E26] hover:bg-[#252834] border border-[#2E313D] text-zinc-200 rounded-lg text-xs font-mono transition-colors"
            >
              <span>Live Floor Command</span>
              <ArrowRight size={13} className="text-[#D4AF37]" />
            </button>
          )}
        </div>
      </header>

      {/* MAIN LAYOUT: FIXED LEFT SIDEBAR + CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* FIXED LEFT SIDEBAR NAVIGATION */}
        <aside className="w-64 shrink-0 bg-[#0D0E12] border-r border-[#22242A] flex flex-col justify-between p-4 select-none">
          <div className="space-y-6">
            <div className="px-2 pt-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                Configuration Suite
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all group relative",
                      isActive
                        ? "bg-[#181920] text-white border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.08)]"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-[#131418] border border-transparent"
                    )}
                  >
                    {/* Active Golden Bar */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-2 bottom-2 w-1 bg-[#D4AF37] rounded-r"
                      />
                    )}

                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      isActive
                        ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                        : "bg-[#16171E] text-zinc-500 group-hover:text-zinc-300"
                    )}>
                      <Icon size={17} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={cn("text-xs font-semibold tracking-tight", isActive ? "text-white" : "text-zinc-300")}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate font-mono">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Bottom: Architecture Status */}
          <div className="p-3 bg-[#131418] border border-[#22242A] rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
              <Shield size={13} />
              <span>Prompt Compiler v2.4</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Section 1 Persona merged dynamically with Section 2 Hard-Coded Safeguards.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-[#0A0A0C] p-6 lg:p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'voice' && <VoicePersonaConfig />}
              {activeTab === 'floor' && <FloorPlanBuilder />}
              {activeTab === 'menu' && <MenuBuilder />}
              {activeTab === 'deploy' && <DeployPanel onSwitchToOperations={onSwitchToOperations} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* FLOATING ACTION BUTTON: Save & Deploy Configuration */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={isDeploying}
          onClick={saveAndDeploy}
          className={cn(
            "flex items-center gap-2.5 px-5 py-3 rounded-full font-mono text-xs font-bold transition-all shadow-2xl backdrop-blur-md",
            hasUnsavedChanges
              ? "bg-[#D4AF37] hover:bg-[#E5C07B] text-black shadow-[0_0_25px_rgba(212,175,55,0.4)] ring-2 ring-[#D4AF37]"
              : "bg-[#131418]/90 hover:bg-[#1C1E26] text-zinc-200 border border-[#2E313D] shadow-black/80"
          )}
        >
          {isDeploying ? (
            <>
              <RefreshCw size={15} className="animate-spin text-[#D4AF37]" />
              <span>Compiling &amp; Deploying...</span>
            </>
          ) : (
            <>
              <Rocket size={15} className={hasUnsavedChanges ? "text-black" : "text-[#D4AF37]"} />
              <span>{hasUnsavedChanges ? "Save & Deploy Configuration" : "Configuration Synced"}</span>
            </>
          )}

          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-black animate-ping" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
