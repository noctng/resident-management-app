import React from 'react';
import { DocumentTextIcon } from '../../components/icons';

interface TemplateConfigTabProps {
  templates: any[];
  selectedTemplate: any;
  setSelectedTemplate: (template: any) => void;
  setIsDirty: (dirty: boolean) => void;
  setError: (err: string | null) => void;
  setSaveMessage: (msg: string | null) => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

export const TemplateConfigTab: React.FC<TemplateConfigTabProps> = ({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  setIsDirty,
  setError,
  setSaveMessage,
}) => {
  return (
    <div className="space-y-6 animate-slide-up">
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4 min-h-[500px] flex flex-col">
        <h2 className="text-sm font-bold text-ink">Quản lý Mẫu Email</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-0">
          {/* List */}
          <div className="md:col-span-1 space-y-2 border-r border-brand-border pr-4 sm:pr-6 overflow-y-auto custom-scrollbar">
            {templates.map((t) => (
              <button
                key={t.code}
                onClick={() => {
                  setSelectedTemplate({ ...t });
                  setError(null);
                  setSaveMessage(null);
                }}
                className={`w-full text-left p-4 rounded-xl transition-colors border cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                  selectedTemplate?.code === t.code
                    ? 'bg-accent-soft border-accent/40 shadow-sm'
                    : 'bg-surface border-transparent hover:bg-surface-alt hover:border-brand-border'
                }`}
              >
                <div className="font-semibold text-ink text-sm">{t.name}</div>
                <div className="text-xs text-ink-soft mt-1 font-mono">
                  {t.code}
                </div>
              </button>
            ))}
          </div>

          {/* Edit Form */}
          <div className="md:col-span-2 flex flex-col h-full">
            {selectedTemplate ? (
              <div className="space-y-5 flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-ink-soft" />
                    {selectedTemplate.name}
                  </h3>
                  <span className="text-xs font-mono bg-surface-alt border border-brand-border px-2 py-1 rounded-lg text-ink-soft">
                    {selectedTemplate.code}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Tiêu đề Email
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.subject}
                    onChange={(e) => {
                      setSelectedTemplate({ ...selectedTemplate, subject: e.target.value });
                      setIsDirty(true);
                    }}
                    className={inputCls}
                  />
                </div>
                <div className="flex-grow flex flex-col min-h-[220px]">
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Nội dung HTML
                  </label>
                  <textarea
                    value={selectedTemplate.body}
                    onChange={(e) => {
                      setSelectedTemplate({ ...selectedTemplate, body: e.target.value });
                      setIsDirty(true);
                    }}
                    className={`${inputCls} flex-grow resize-y font-mono`}
                    rows={10}
                  />
                </div>
                <div className="font-mono text-xs bg-surface-alt rounded-lg p-3 border border-brand-border whitespace-pre-wrap text-ink-soft">
                  <b className="text-ink">Các biến có sẵn:</b>{' '}
                  {selectedTemplate.variables
                    ? JSON.stringify(selectedTemplate.variables).replace(/[[\]"]/g, ' ')
                    : 'Không có thông tin'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-ink-soft py-12">
                <DocumentTextIcon className="w-16 h-16 mb-4 opacity-40" />
                <p>Chọn một mẫu email bên trái để bắt đầu chỉnh sửa.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default TemplateConfigTab;
