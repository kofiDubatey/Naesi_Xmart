
import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  const lines = text.split('\n');
  
  const processLine = (line: string, index: number) => {
    // Handle Headings (### or ##)
    if (line.startsWith('###') || line.startsWith('##') || line.startsWith('#')) {
      const cleanLine = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      return (
        <h4 key={index} className="text-white font-space font-bold text-lg mt-8 mb-4 uppercase tracking-tighter border-l-4 border-cyan-500 pl-4 bg-white/5 py-2 rounded-r-xl">
          {cleanLine}
        </h4>
      );
    }

    // Handle List Items (* or -)
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const content = line.trim().replace(/^[\*\-]\s*/, '');
      return (
        <div key={index} className="flex gap-3 mb-3 pl-2 group">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0 group-hover:scale-150 transition-transform shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
          <p className="text-slate-300 text-sm leading-relaxed">{renderInline(content)}</p>
        </div>
      );
    }

    // Regular Paragraph
    if (line.trim() === '') return <div key={index} className="h-4" />;

    return (
      <p key={index} className="text-slate-400 text-sm leading-relaxed mb-4 pl-1">
        {renderInline(line)}
      </p>
    );
  };

  const renderInline = (content: string) => {
    // Basic bold parsing: **text**
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={i} className="text-white font-bold tracking-tight px-1 bg-white/5 rounded mx-0.5 border border-white/5">
            {part.slice(2, -2)}
          </span>
        );
      }
      // Handle inline code or backticks if needed
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded font-mono text-[10px] mx-1 border border-white/10">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className={`formatted-text-root ${className}`}>
      {lines.map((line, idx) => processLine(line, idx))}
    </div>
  );
};

export default FormattedText;
