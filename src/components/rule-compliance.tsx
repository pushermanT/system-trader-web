'use client';

import { TradeRuleCompliance } from '@/lib/types';

interface RuleComplianceProps {
  compliance: TradeRuleCompliance[];
}

export default function RuleCompliance({ compliance }: RuleComplianceProps) {
  // Group by rule_text and calculate follow rate
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
    return <p className="text-sm text-gray-500">No rule compliance data yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div key={rule.text}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300 truncate mr-4">{rule.text}</span>
            <span className={`whitespace-nowrap font-medium ${
              rule.rate >= 80 ? 'text-green-400' : rule.rate >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {rule.rate.toFixed(0)}% ({rule.followed}/{rule.total})
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-gray-800">
            <div
              className={`h-1.5 rounded-full ${
                rule.rate >= 80 ? 'bg-green-500' : rule.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${rule.rate}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
