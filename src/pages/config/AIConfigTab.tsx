import React, { useState } from 'react';
import {
  SparklesIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '../../components/icons';

interface AIConfigData {
  AI_BASE_URL: string;
  AI_API_KEY: string;
  AI_MODEL: string;
  AI_HAS_KEY?: boolean;
}

interface AIConfigTabProps {
  aiConfig: AIConfigData;
  setAiConfig: React.Dispatch<React.SetStateAction<AIConfigData>>;
  setIsAIDirty: (dirty: boolean) => void;
  setSaveMessage: (msg: string | null) => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

export const AIConfigTab: React.FC<AIConfigTabProps> = ({
  aiConfig,
  setAiConfig,
  setIsAIDirty,
  setSaveMessage,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header card */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <span className="p-3 bg-accent-soft text-accent-ink rounded-xl shrink-0">
            <SparklesIcon className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">
              Cấu hình AI Phân tích Đồng hồ
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              Kết nối model AI vision tương thích OpenAI để tự động đọc chỉ số điện nước từ ảnh chụp
              đồng hồ. Hỗ trợ OpenAI, Gemini, Groq, Ollama, và bất kỳ API nào dùng format OpenAI.
            </p>
          </div>
        </div>
      </section>

      {/* Main config form */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
          <CpuChipIcon className="w-5 h-5 text-brand-teal" />
          Thông tin kết nối API
        </h3>

        <div className="space-y-5">
          {/* Base URL */}
          <div>
            <label
              htmlFor="ai-base-url"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Base URL
              <span className="ml-2 text-xs font-normal text-ink-soft">
                (endpoint gốc, không gồm /chat/completions)
              </span>
            </label>
            <input
              id="ai-base-url"
              type="url"
              value={aiConfig.AI_BASE_URL}
              onChange={(e) => {
                setAiConfig({ ...aiConfig, AI_BASE_URL: e.target.value });
                setIsAIDirty(true);
                setSaveMessage(null);
              }}
              placeholder="https://api.openai.com/v1"
              className={`${inputCls} font-mono`}
            />
          </div>

          {/* API Key */}
          <div>
            <label
              htmlFor="ai-api-key"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              API Key
              {aiConfig.AI_HAS_KEY && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-brand-success">
                  <CheckCircleIcon className="w-3.5 h-3.5" /> Đã cấu hình
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="ai-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={aiConfig.AI_API_KEY}
                onChange={(e) => {
                  setAiConfig({ ...aiConfig, AI_API_KEY: e.target.value });
                  setIsAIDirty(true);
                  setSaveMessage(null);
                }}
                placeholder={aiConfig.AI_HAS_KEY ? '••••••••  (nhập để thay đổi)' : 'sk-...'}
                className={`${inputCls} pr-10 font-mono`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                aria-label={showApiKey ? 'Ẩn API Key' : 'Hiện API Key'}
                title={showApiKey ? 'Ẩn API Key' : 'Hiện API Key'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-soft hover:text-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {showApiKey ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              Key được mã hóa và lưu an toàn trong database, không hiển thị lại sau khi lưu.
            </p>
          </div>

          {/* Model Name */}
          <div>
            <label
              htmlFor="ai-model"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Tên Model
            </label>
            <input
              id="ai-model"
              type="text"
              value={aiConfig.AI_MODEL}
              onChange={(e) => {
                setAiConfig({ ...aiConfig, AI_MODEL: e.target.value });
                setIsAIDirty(true);
                setSaveMessage(null);
              }}
              placeholder="gpt-4o"
              className={`${inputCls} font-mono`}
            />
          </div>
        </div>
      </section>

      {/* Provider presets */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-bold text-ink">
          Chọn nhanh nhà cung cấp
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              name: 'OpenAI',
              url: 'https://api.openai.com/v1',
              model: 'gpt-4o',
            },
            {
              name: 'Gemini',
              url: 'https://generativelanguage.googleapis.com/v1beta/openai',
              model: 'gemini-2.5-flash',
            },
            {
              name: 'Groq',
              url: 'https://api.groq.com/openai/v1',
              model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            },
            {
              name: 'Ollama (local)',
              url: 'http://localhost:11434/v1',
              model: 'llava',
            },
          ].map((p) => {
            const isActive = aiConfig.AI_BASE_URL === p.url;
            return (
              <button
                key={p.name}
                aria-pressed={isActive}
                onClick={() => {
                  setAiConfig((prev) => ({ ...prev, AI_BASE_URL: p.url, AI_MODEL: p.model }));
                  setIsAIDirty(true);
                  setSaveMessage(null);
                }}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                  isActive
                    ? 'bg-accent border-accent text-white'
                    : 'bg-surface border-brand-border text-ink hover:bg-accent-soft/40 hover:border-accent/40'
                }`}
              >
                <div className="font-semibold">{p.name}</div>
                <div
                  className={`text-xs font-mono mt-0.5 truncate ${
                    isActive ? 'text-white/80' : 'text-ink-soft'
                  }`}
                >
                  {p.model}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Info box */}
      <section className="bg-brand-warning-soft border border-brand-warning/20 rounded-lg px-3 py-2 text-sm">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-brand-warning mt-0.5 shrink-0" />
          <div className="text-sm text-brand-warning space-y-1">
            <p className="font-semibold">Lưu ý khi cấu hình</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Model phải hỗ trợ <strong>vision</strong> (nhận input là ảnh).
              </li>
              <li>
                Format URL:{' '}
                <code className="bg-surface px-1 rounded font-mono">
                  https://api.example.com/v1
                </code>{' '}
                — không cần thêm <code className="font-mono">/chat/completions</code>.
              </li>
              <li>
                Gemini dùng endpoint OpenAI-compat:{' '}
                <code className="font-mono text-xs">...googleapis.com/v1beta/openai</code>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AIConfigTab;
