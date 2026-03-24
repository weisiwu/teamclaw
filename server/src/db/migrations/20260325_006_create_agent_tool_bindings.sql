-- Migration: Create agent_tool_bindings table
-- Stores Agent-Tool binding relationships and permission controls

CREATE TABLE IF NOT EXISTS agent_tool_bindings (
  id               VARCHAR(64) PRIMARY KEY,
  agent_name       VARCHAR(64) NOT NULL,
  tool_id          VARCHAR(64) NOT NULL,
  enabled          INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  requires_approval INTEGER NOT NULL DEFAULT 0 CHECK (requires_approval IN (0, 1)),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 唯一约束：同一 Agent + Tool 组合只能有一条记录
  UNIQUE (agent_name, tool_id)
);

-- 常用查询索引
CREATE INDEX IF NOT EXISTS idx_atb_agent_name ON agent_tool_bindings(agent_name);
CREATE INDEX IF NOT EXISTS idx_atb_tool_id ON agent_tool_bindings(tool_id);
CREATE INDEX IF NOT EXISTS idx_atb_enabled ON agent_tool_bindings(enabled);

COMMENT ON TABLE agent_tool_bindings IS 'Agent 与 Tool 的绑定关系表，控制各 Agent 的工具使用权限';
COMMENT ON COLUMN agent_tool_bindings.agent_name IS 'Agent 名称';
COMMENT ON COLUMN agent_tool_bindings.tool_id IS 'Tool ID';
COMMENT ON COLUMN agent_tool_bindings.enabled IS '该 Agent 是否可使用此 Tool';
COMMENT ON COLUMN agent_tool_bindings.requires_approval IS '是否覆盖 Tool 默认审批设置';
