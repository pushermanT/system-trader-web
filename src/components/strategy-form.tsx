'use client';

import { useState } from 'react';
import { Strategy, Rule } from '@/lib/types';

interface StrategyFormProps {
  strategy?: Strategy & { rules: Rule[] };
  onSave: (data: { name: string; description: string; rules: string[]; max_loss_threshold?: number | null }) => Promise<void>;
  onCancel: () => void;
}

export default function StrategyForm({ strategy, onSave, onCancel }: StrategyFormProps) {
  const [name, setName] = useState(strategy?.name ?? '');
  const [description, setDescription] = useState(strategy?.description ?? '');
  const [rules, setRules] = useState<string[]>(
    strategy?.rules?.sort((a, b) => a.order - b.order).map((r) => r.text) ?? ['']
  );
  const [maxLossThreshold, setMaxLossThreshold] = useState(strategy?.max_loss_threshold?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  function addRule() {
    setRules([...rules, '']);
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index));
  }

  function updateRule(index: number, value: string) {
    const updated = [...rules];
    updated[index] = value;
    setRules(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const filteredRules = rules.filter((r) => r.trim() !== '');
    await onSave({
      name,
      description,
      rules: filteredRules,
      max_loss_threshold: maxLossThreshold ? parseFloat(maxLossThreshold) : null,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Rules</label>
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex gap-2">
              <span className="mt-2 text-sm text-gray-500">{index + 1}.</span>
              <input
                value={rule}
                onChange={(e) => updateRule(index, e.target.value)}
                placeholder="Enter rule..."
                className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="px-2 text-gray-500 hover:text-red-400"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRule}
          className="mt-2 text-sm text-blue-400 hover:underline"
        >
          + Add Rule
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300">Max Loss Threshold ($) <span className="text-gray-600 font-normal">— triggers autopsy on big losses</span></label>
        <input
          type="number"
          step="any"
          value={maxLossThreshold}
          onChange={(e) => setMaxLossThreshold(e.target.value)}
          placeholder="e.g. 500"
          className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
