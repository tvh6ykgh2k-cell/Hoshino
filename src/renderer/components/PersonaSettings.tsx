import React, { useState, useEffect } from 'react';
import { usePersona } from '../hooks/usePersona';
import { PERSONA_TEMPLATES } from '../../shared/types';
import type { Persona } from '../../shared/types';

const inputClass = "w-full bg-surface-800 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/40 transition-all";
const labelClass = "text-[11px] text-gray-500 font-medium mb-1.5 block";

export default function PersonaSettings() {
  const { persona, savePersona } = usePersona();
  const [form, setForm] = useState<Persona>(persona);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(persona);
  }, [persona]);

  const handleTemplate = (key: string) => {
    const template = PERSONA_TEMPLATES[key];
    if (template) setForm({ ...template });
  };

  const handleSave = () => {
    savePersona(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const activeTemplate = Object.keys(PERSONA_TEMPLATES).find(k => PERSONA_TEMPLATES[k].template === form.template) || 'academic';

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🎭</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI 人格</span>
      </div>

      {/* 模板选择 */}
      <div className="mb-4">
        <label className={labelClass}>预设模板</label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(PERSONA_TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTemplate(key)}
              className={`text-xs px-3 py-2 rounded-lg border transition-all duration-200 ${
                activeTemplate === key
                  ? 'bg-accent-500/10 border-accent-500/30 text-accent-300'
                  : 'bg-surface-800 border-white/[0.04] text-gray-500 hover:text-gray-300 hover:border-white/[0.1]'
              }`}
            >
              {tmpl.template}
            </button>
          ))}
        </div>
      </div>

      {/* 名称 */}
      <div className="mb-4">
        <label className={labelClass}>名称</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* 教学风格 */}
      <div className="mb-4">
        <label className={labelClass}>教学风格</label>
        <select
          value={form.teachingStyle}
          onChange={e => setForm({ ...form, teachingStyle: e.target.value as Persona['teachingStyle'] })}
          className={inputClass}
        >
          <option value="academic">🎓 学院派</option>
          <option value="practical">⚡ 实战派</option>
          <option value="socratic">🤔 苏格拉底式</option>
          <option value="peer">🤝 同行搭档</option>
        </select>
      </div>

      {/* 角色设定 */}
      <div className="mb-5">
        <label className={labelClass}>角色设定</label>
        <textarea
          value={form.roleDescription}
          onChange={e => setForm({ ...form, roleDescription: e.target.value })}
          rows={4}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* 保存 */}
      <button
        type="button"
        onClick={handleSave}
        className={`w-full py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-accent-600 text-white hover:bg-accent-500 hover:shadow-lg hover:shadow-accent-500/20'
        }`}
      >
        {saved ? '✓ 已保存' : '保存人格'}
      </button>
    </div>
  );
}
