import React, { useState, useEffect } from 'react';
import { usePersona } from '../hooks/usePersona';
import { PERSONA_TEMPLATES } from '../../shared/types';
import type { Persona } from '../../shared/types';

export default function PersonaSettings() {
  const { persona, savePersona } = usePersona();
  const [form, setForm] = useState<Persona>(persona);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(persona);
  }, [persona]);

  const handleTemplate = (key: string) => {
    const template = PERSONA_TEMPLATES[key];
    if (template) {
      setForm({ ...template });
    }
  };

  const handleSave = () => {
    savePersona(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">AI 人格设置</p>

      <label className="text-xs text-gray-400 mb-1 block">模板</label>
      <select
        value={Object.keys(PERSONA_TEMPLATES).find(k => PERSONA_TEMPLATES[k].template === form.template) || 'academic'}
        onChange={e => handleTemplate(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-3 focus:outline-none focus:border-blue-500"
      >
        {Object.entries(PERSONA_TEMPLATES).map(([key, tmpl]) => (
          <option key={key} value={key}>{tmpl.template}</option>
        ))}
      </select>

      <label className="text-xs text-gray-400 mb-1 block">名称</label>
      <input
        type="text"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-3 focus:outline-none focus:border-blue-500"
      />

      <label className="text-xs text-gray-400 mb-1 block">教学风格</label>
      <select
        value={form.teachingStyle}
        onChange={e => setForm({ ...form, teachingStyle: e.target.value as Persona['teachingStyle'] })}
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-3 focus:outline-none focus:border-blue-500"
      >
        <option value="academic">学院派</option>
        <option value="practical">实战派</option>
        <option value="socratic">苏格拉底式</option>
        <option value="peer">同行搭档</option>
      </select>

      <label className="text-xs text-gray-400 mb-1 block">角色设定</label>
      <textarea
        value={form.roleDescription}
        onChange={e => setForm({ ...form, roleDescription: e.target.value })}
        rows={4}
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-3 focus:outline-none focus:border-blue-500 resize-none"
      />

      <button
        onClick={handleSave}
        className="w-full py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
      >
        {saved ? '✅ 已保存' : '保存人格'}
      </button>
    </div>
  );
}
