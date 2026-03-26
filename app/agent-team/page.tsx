'use client';

import { useState } from 'react';
import { useAgentList, useTeamOverview } from '@/hooks/useAgents';
import { AgentCard } from '@/components/agent-team/AgentCard';
import { HierarchyChart } from '@/components/agent-team/HierarchyChart';
import { AgentDetailPanel } from '@/components/agent-team/AgentDetailPanel';
import { PipelineStatusPanel, PipelineStarter } from '@/components/agent-team/PipelineStatusPanel';
import { RefreshCw, Users, Zap, Wrench, BookOpen } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useTools } from '@/hooks/useTools';
import { useSkills } from '@/hooks/useSkills';
import { Agent } from '@/lib/api/agents';
import { Tool } from '@/lib/api/tools';
import { Skill } from '@/lib/api/skills';
import { AgentTeamSkeleton } from '@/components/ui/projects-skeleton';

export default function AgentTeamPage() {
  const { data: agents, isLoading, error, refetch } = useAgentList();
  const { data: overview } = useTeamOverview();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [showPipelinePanel, setShowPipelinePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'agents' | 'tools' | 'skills'>('agents');

  const { data: toolData } = useTools({});
  const { data: skillData } = useSkills({});

  const tools: Tool[] = toolData?.list ?? [];
  const skills: Skill[] = skillData?.list ?? [];
  const toolEnabled = tools.filter((t) => t.enabled).length;
  const skillEnabled = skills.filter((s) => s.enabled).length;

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Agent 团队</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          加载数据失败，请检查后端服务是否运行（localhost:9700）
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="page-header-title">Agent 团队</h1>
            <p className="text-sm text-muted-foreground">
              {agents ? `${agents.length} 个 Agent 在线` : '加载中...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPipelinePanel(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              showPipelinePanel
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'hover:bg-muted text-muted-foreground'
            }`}
            title="协作流水线"
          >
            <Zap className="w-4 h-4" />
            流水线
            {activePipelineId && <span className="w-2 h-2 rounded-full bg-blue-500" />}
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="mb-6">
        <TabsList>
          <TabsTrigger value="agents">
            <Users className="w-4 h-4 mr-1.5" />
            团队成员
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="w-4 h-4 mr-1.5" />
            Tools
            {toolEnabled > 0 && (
              <span className="ml-1.5 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                {toolEnabled}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="skills">
            <BookOpen className="w-4 h-4 mr-1.5" />
            Skills
            {skillEnabled > 0 && (
              <span className="ml-1.5 bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full dark:bg-purple-900/30 dark:text-purple-400">
                {skillEnabled}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents">
          {isLoading ? (
            <AgentTeamSkeleton />
          ) : (
            <>
              {/* Pipeline Panel */}
              {showPipelinePanel && (
                <div className="space-y-4 mb-6">
                  <PipelineStarter
                    onStarted={pipelineId => {
                      setActivePipelineId(pipelineId);
                      setShowPipelinePanel(true);
                    }}
                  />
                  <PipelineStatusPanel pipelineId={activePipelineId} />
                </div>
              )}

              {/* Hierarchy Chart */}
              {overview && (
                <HierarchyChart
                  overview={overview}
                  selectedAgent={selectedAgent?.name || null}
                  onSelectAgent={name => {
                    const a = agents?.find((ag: Agent) => ag.name === name);
                    if (a) setSelectedAgent(a);
                  }}
                />
              )}

              {/* Agent Cards Grid */}
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">团队成员</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {agents?.map(agent => (
                    <AgentCard
                      key={agent.name}
                      agent={agent}
                      isSelected={selectedAgent?.name === agent.name}
                      onClick={() => setSelectedAgent(agent)}
                    />
                  ))}
                </div>
              </div>

              {/* Dispatch Matrix Info */}
              {overview && (
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">指派规则矩阵</h3>
                  <div className="space-y-2">
                    {Object.entries(overview.dispatchMatrix).map(([from, toList]) => (
                      <div key={from} className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground w-20">{from}</span>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex gap-1.5">
                          {(toList as string[]).map(to => (
                            <span
                              key={to}
                              className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs"
                            >
                              {to}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    规则：高级可指派低级（Lv3 → Lv2 → Lv1），反向不可
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-foreground">Tools</span>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {tools.length} 个
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    （{toolEnabled} 启用 / {tools.length - toolEnabled} 禁用）
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  完整管理请访问{" "}
                  <a href="/agent-team?tab=tools" className="text-blue-600 hover:underline">
                    /capabilities
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
          {tools.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无 Tools，请前往 /capabilities 创建
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.slice(0, 12).map((tool: Tool) => (
                <Card key={tool.id} className={`border-l-4 ${tool.enabled ? "border-l-green-400" : "border-l-gray-300 dark:border-l-slate-600 opacity-75"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{tool.name}</h3>
                          {!tool.enabled && (
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              禁用
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">{tool.identifier}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                      <span className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">
                        {tool.category}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-foreground">Skills</span>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {skills.length} 个
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    （{skillEnabled} 启用 / {skills.length - skillEnabled} 禁用）
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  完整管理请访问{" "}
                  <a href="/agent-team?tab=skills" className="text-blue-600 hover:underline">
                    /capabilities
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
          {skills.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无 Skills，请前往 /capabilities 创建
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.slice(0, 12).map((skill: Skill) => (
                <Card key={skill.id} className={`border-l-4 ${skill.enabled ? "border-l-blue-400" : "border-l-gray-300 dark:border-l-slate-600 opacity-75"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{skill.name}</h3>
                          {!skill.enabled && (
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              禁用
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">{skill.identifier}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-border">
                      <span className="text-xs bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded">
                        {skill.category}
                      </span>
                      {skill.tags?.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Panel */}
      {selectedAgent && (
        <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
