'use client';

import { TradeRuleCompliance } from '@/lib/types';

interface RuleComplianceProps {
  compliance: TradeRuleCompliance[];
}

export default function RuleCompliance({ compliance }: RuleComplianceProps) {
  const ruleMap = new Map<string, { total: number; followed: number }>();

  compliance.forEach((c) => {
    const key = c.rule_text;
    const entry = ruleMap.get(key) ?? { total: 0, followed: 0 };
    entry.total++;
    if (c.followed) entry.followed++;
    ruleMap.set(key, entry);
  });

  const rules = Array.from(ruleMap.entries())
    .map(([text, data]) => ({
      text,
      rate: data.total > 0 ? (data.followed / data.total) * 100 : 0,
      total: data.total,
      followed: data.followed,
    }))
    .sort((a, b) => a.rate - b.rate);

  if (rules.length === 0) {
    return <p className="text-sm font-mono text-gray-600">No rule compliance data yet.</p>;
  }

  function rateColor(rate: number): string {
    if (rate >= 80) return '#4ec9b0';
    if (rate >= 50) return '#dcdcaa';
    return '#f44747';
  }

  function barColor(rate: number): string {
    if (rate >= 80) return '#4ec9b0';
    if (rate >= 50) return '#dcdcaa';
    return '#f44747';
  }

  return (
    <div className="space-y-3 font-mono">
      {rules.map((rule) => (
        <div key={rule.text}>
          <div className="flex items-center justify-between text-[15px]">
            <span className="text-gray-300 truncate mr-4">{rule.text}</span>
            <span className="whitespace-nowrap font-bold" style={{ color: rateColor(rule.rate) }}>
              {rule.rate.toFixed(0)}%
              <span className="text-gray-600 font-normal ml-1">({rule.followed}/{rule.total})</span>
            </span>
          </div>
          <div className="mt-1 h-1 w-full" style={{ background: '#1a1a1a' }}>
            <div
              className="h-1"
              style={{ width: `${rule.rate}%`, background: barColor(rule.rate), opacity: 0.7 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
